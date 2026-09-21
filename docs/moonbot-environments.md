# Acceso a los Docker de Moonbot desde todosobreall.tech

En **Dashboard → Versiones y entornos** el creador asigna los Docker de desarrollo, alfa, beta y RC que puede abrir cada administrador. No cambia la instancia global del balanceador ni concede permisos internos de Moonbot.

## Funcionamiento

- El catálogo contiene hasta 24 instancias, cada una con identificador, canal, versión declarada y un subdominio HTTPS propio. Puede haber varias versiones del mismo canal, usando IDs y hosts distintos.
- Por defecto, ningún administrador tiene acceso. El creador puede configurar un acceso general para todos los administradores y excepciones por cuenta. Una excepción sustituye completamente el acceso general; una lista vacía deniega todos los entornos. El creador tiene acceso al catálogo completo.
- Un administrador solo recibe las direcciones de los entornos que tiene permitidos. Al pulsar **Abrir Moonbot**, la API vuelve a comprobar su cuenta y permisos y crea una cookie segura de diez minutos para ese entorno. El navegador abre el Docker en la misma pestaña.
- Traefik consulta a la API antes de servir HTML, recursos o API del entorno. Una revocación, congelación o pérdida del rol bloquea la siguiente petición. Las conexiones persistentes ya establecidas, como WebSockets, no se cierran retrospectivamente.
- El acceso no sustituye el login de Moonbot ni convierte un administrador web en master de Telegram. Tampoco cambia la Bot API a la que están conectados los bots de producción.
- Los permisos se asocian al ID del entorno. Actualizar su imagen mantiene sus asignaciones. Para probar otra versión con permisos distintos, registra otro ID y otro host. La versión mostrada es la declarada en el catálogo, no una medición del contenedor.

## Configurar la API

Aplica la migración `1790020000_add_moonbot_environment_access.js` al arrancar PocketBase y configura en el `.env` que recibe el servicio API:

```dotenv
RELEASE_COOKIE_DOMAIN=.todosobreall.tech
MOON_ENVIRONMENT_SECRET=<clave aleatoria independiente de al menos 32 caracteres>
MOON_ENVIRONMENTS=[{"id":"moon-dev","channel":"dev","name":"Moonbot Desarrollo","version":"commit o versión desplegada","url":"https://moon-dev.todosobreall.tech"},{"id":"moon-alpha","channel":"alpha","name":"Moonbot Alfa","version":"v18.23.17-alpha.3","url":"https://moon-alpha.todosobreall.tech"},{"id":"moon-beta","channel":"beta","name":"Moonbot Beta","version":"versión desplegada","url":"https://moon-beta.todosobreall.tech"},{"id":"moon-rc","channel":"rc","name":"Moonbot RC","version":"versión desplegada","url":"https://moon-rc.todosobreall.tech"}]
```

Reinicia la API cuando cambies el catálogo o la clave. El dominio de cookies debe abarcar la web y sus entornos. No se aceptan URLs externas, credenciales en la URL, puertos, rutas ni hosts compartidos entre instancias. Cambiar la clave invalida todas las sesiones. El secreto queda exclusivamente en la API.

La colección `moonbot_environment_access` está bloqueada para los clientes PocketBase: únicamente la API con su cliente superuser puede leer o modificar las políticas. Cada cambio conserva autor, estado previo y nuevo en un historial acotado de 50 entradas. El control de revisión evita sobrescribir una edición antigua. Como el gestor de conmutación actual, utiliza una sola réplica escritora de la API para serializar las modificaciones; varias réplicas requieren un bloqueo distribuido o transacción equivalente.

## Proteger y desplegar cada Docker

Se incluye `integrations/moonbot/docker-compose.environment.yml`: crea una instancia aislada por proyecto Compose, sin puertos publicados directamente y con [ForwardAuth de Traefik](https://doc.traefik.io/traefik/v3.4/reference/routing-configuration/http/middlewares/forwardauth/) obligatorio. El gateway solo autoriza respuestas 2xx y transmite el host y protocolo originales a la API. Para un entorno alfa, define un archivo de configuración de Compose con:

```dotenv
MOON_ENVIRONMENT_ID=moon-alpha
MOON_ENVIRONMENT_CHANNEL=alpha
MOON_ENVIRONMENT_HOST=moon-alpha.todosobreall.tech
MOON_ENVIRONMENT_IMAGE=tu-registro/moonbot:18.23.17-alpha.3
MOON_ENVIRONMENT_FILE=/ruta/privada/moonbot-alpha.env
```

Usa una imagen previamente construida desde la rama/commit que vas a probar. El archivo privado de Moonbot debe contener credenciales y configuración de prueba independientes, nunca copias de los tokens o sesiones activos de producción. Los volúmenes `data` y `downloads` quedan aislados por proyecto; no montes el código fuente ni los datos productivos sobre la imagen.

```sh
docker compose --env-file /ruta/privada/alpha-compose.env \
  -p moon-alpha -f integrations/moonbot/docker-compose.environment.yml config
docker compose --env-file /ruta/privada/alpha-compose.env \
  -p moon-alpha -f integrations/moonbot/docker-compose.environment.yml up -d
```

Repite con un proyecto, ID, host, imagen y archivo privado diferentes para dev/beta/RC. La API debe estar accesible como `todosobrealltech-api:3001` en la red externa de Traefik; el Compose principal ya declara ese alias. Configura DNS y TLS para los subdominios. No conectes estos entornos al catálogo `MOON_CLUSTER_NODES`: el balanceador tiene otra finalidad.

Si los Docker ya existen, aplica a **todos sus routers** las etiquetas ForwardAuth y de caché de la plantilla; elimina las rutas alternativas y puertos públicos que eviten el gateway. No registres una URL pública sin esa protección: una lista de enlaces no protege un Docker por sí sola. El gateway protege también `/api` y `/health` desde el exterior; utiliza bots de prueba en polling o una arquitectura de webhooks independiente, no una excepción pública que anule la protección.

## API y verificación

### Detección de abuso de permisos

El creador ve las alertas en **Versiones y entornos**, con identidad comprobada, umbral, motivo y alcance cuando están disponibles. No implica culpabilidad y no congela cuentas automáticamente. Puede marcar una observación como actividad esperada o revisada para investigar. Una nueva observación que alcance el umbral vuelve a abrir la alerta y conserva la última revisión.

Se detectan cinco aperturas denegadas o veinte sesiones nuevas en cinco minutos, cualquier intento autenticado de asignar permisos sin autorización, ampliaciones del acceso general o de tres entornos a una cuenta, y uso reiterado de sesiones válidas sin permiso vigente. En el gateway se cuenta como máximo una denegación por cuenta/entorno cada treinta segundos para reducir el ruido de assets y pestañas abiertas. Cookies ausentes o caducadas y errores de configuración o base de datos no cuentan como abuso.

Las firmas inválidas se agregan sin atribuirlas a cuentas: nunca se confía en la identidad escrita dentro de una cookie no verificada. Se toma como máximo una muestra por entorno cada dos segundos y se alerta a partir de veinte muestras en cinco minutos. Este agregado no identifica al origen de las peticiones.

El archivo `MOON_PERMISSION_AUDIT_FILE` conserva hasta 200 alertas durante siete días y 2000 observaciones en la ventana activa. El valor predeterminado es `/data/moonbot-permission-audit.json` en Linux y `data/moonbot-permission-audit.json` en Windows. El servicio API ya monta `/data`; mantén una sola réplica escritora y no compartas el archivo entre réplicas. Se serializan escrituras y se sustituye el archivo de forma atómica. Si falla el almacenamiento se muestra una advertencia; los controles de autorización siguen funcionando. Los límites y el muestreo pueden omitir eventos bajo carga. No es un registro forense completo.

No se guardan tokens, cookies, IP, cuerpos de peticiones ni mensajes. La revisión solo guarda resultado, autor y fecha. Los administradores no pueden leer ni revisar alertas. Se consulta al actualizar el panel; no se envían notificaciones externas. Este detector cubre los permisos de entrada a los entornos, no las acciones internas de Moonbot ni el resto de permisos de la web.

`POST /moonbot-environments/alerts/:id/review` acepta `{outcome: "expected" | "investigate"}` exclusivamente para el creador.

- `GET /moonbot-environments`: destinos propios; para el creador también políticas generales y administradores.
- `PUT /moonbot-environments/access`: solo creador; `{scope: "global" | accountId, mode: "custom" | "inherit", targets: [id], revision: number}`.
- `POST /moonbot-environments/:id/open`: emite la cookie HttpOnly/Secure específica y devuelve la URL permitida.
- `GET /moonbot-environments/forward-auth/:id`: puerta para Traefik; comprueba cookie firmada, caducidad, host/protocolo y permisos actuales. Cualquier fallo de PocketBase deniega el acceso.
- `DELETE /moonbot-environments/session`: elimina las cookies de los entornos configurados. También se solicita al cerrar sesión en la web.

Después de desplegar, verifica sin cookie que el host protegido devuelve 403; asigna solo alfa a un administrador y comprueba que alfa abre y beta no; revoca alfa y comprueba que la siguiente petición falla. Prueba también el modo general y una excepción vacía. La vista previa local `/dev/moonbot-control` muestra fixtures identificados y acciones deshabilitadas; no crea usuarios ni permisos reales. Las cookies de acceso real requieren HTTPS y el dominio configurado.

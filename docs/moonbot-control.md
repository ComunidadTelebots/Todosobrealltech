# Balanceo y conmutación de Moonbot

La interfaz pertenece a **todosobreall.tech**: `/dashboard?moon=moon-balancer`, para administradores y creadores. Se consulta cada cinco segundos mientras la pestaña está visible. La sección también abre si el resumen general de Moonbot falla.

## Contrato verificado

Se revisó `ComunidadTelebots/moon-multibot`, rama `master`, commit `22d2b1f`. Su endpoint `GET /api/ia/load_balancer` usa JWT de Moonbot en `Authorization: Bearer …`. Devuelve `state` y `stats`: workers asignados, fuentes procesadas, plan y ritmo. Son hilos de aprendizaje Gutenberg dentro de un proceso, no réplicas Docker. No publica carga individual de los workers. La gráfica conserva las últimas treinta lecturas de la sesión.

La API de esta web vive en `apps/api`. Su autenticación PocketBase protege tanto la consulta como la conmutación. El JWT de Moonbot nunca se envía al navegador. La integración nativa se prepara sobre `moon-multibot/alpha` (base `3510737`) como `v18.23.17-alpha.1`; esa rama sí contiene `/api/internal/admin-overview`. La web se integra sobre `Todosobrealltech/main` (base `4dc8eee`), conservando el cliente compartido y su política de reintentos. Las lecturas siguientes a una conmutación resuelven el nuevo nodo activo.

## Configuración del servidor

1. Preparar al menos dos contenedores del mismo servicio, con configuración y datos compatibles, en el **mismo host Docker**. El primero debe ser el origen actual; los demás deben estar detenidos. Este cambio no crea ni duplica bases de datos ni tokens. No usarlo para servicios distintos o réplicas activas que atienden bots diferentes.
2. En el entorno de `apps/api`, configurar una lista explícita (los siguientes nombres son ejemplos):

   ```env
   MOON_CLUSTER_NODES=[{"id":"primary","container":"moonbot","url":"http://moonbot:5000"},{"id":"backup","container":"moonbot-backup","url":"http://moonbot-backup:5000"}]
   MOON_BALANCER_TOKEN=JWT_DE_MOONBOT
   MOON_CLUSTER_STATE_FILE=/data/moonbot-cluster.json
   ```

   El JWT debe ser válido en ambos contenedores; renovarlo cuando caduque. Cada URL debe resolver directamente al contenedor correspondiente desde la API. Los contenedores deben compartir la red de la API.
3. Activar el acceso al socket únicamente en el host que administra Moonbot:

   ```sh
   docker compose -f docker-compose.yml -f docker-compose.moonbot-control.yml up -d --build api web
   ```

   Añadir cualquier otro archivo Compose que requiera el despliegue existente. El socket otorga privilegios de administración Docker al proceso API: desplegar en una red privada y con un único proceso/réplica API. El controlador solo llama inspect/start/stop para los nombres de la lista. No está diseñado como controlador distribuido.
4. Conservar el volumen `/data` para persistir nodo activo y auditoría. Configurar las reglas de Traefik del servicio Moonbot para dirigir el dominio del bot al contenedor que esté activo; el controlador no modifica Traefik. La API administrativa de esta web sí cambia su origen al destino verificado. Otros clientes, webhooks y accesos directos necesitan su propia ruta estable.

## Secuencia y recuperación

El servidor comprueba la lista, el origen esperado y que ningún otro contenedor esté ejecutándose. Registra el intento, detiene el origen, verifica la parada, arranca el destino y verifica tanto Docker como `GET /health` (`ok: true`). Solo después persiste el destino como activo. Si el destino falla, intenta detenerlo antes de restaurar y verificar el origen. No arranca el origen si no puede confirmar la parada del destino.

No se reintentan automáticamente solicitudes POST; un timeout del navegador puede coexistir con un cambio aún en curso. Consultar el estado e historial antes de volver a operar. Si la API o el host cae durante un cambio, inspeccionar ambos contenedores y el último evento antes de recuperar. El controlador no ofrece failover entre servidores ni alta disponibilidad del propio Docker/API/PocketBase.

## Desarrollo y validación

`npm run dev --prefix apps/web` arranca Vite en 3000. `npm run dev --prefix apps/api` arranca Express en 3001 (requiere `ENCRYPTION_KEY`). Vite redirige `/hcgi/api` a Express y `/hcgi/platform` a PocketBase local en 8090. Es necesario arrancar/configurar PocketBase para iniciar sesión. La interfaz no desactiva la autenticación para desarrollo.

Vista previa del diseño: `http://localhost:3000/dev/moonbot-control`. Usa datos de ejemplo explícitamente señalizados, sin peticiones reales ni controles activos. Esta ruta y sus datos se excluyen de la compilación de producción.

Pruebas del controlador: `node --test apps/api/test/moonbotCluster.test.js`. Cubren orden de parada/arranque, persistencia, rollback, exclusión mutua, origen obsoleto, listas permitidas y Docker inaccesible. Las pruebas usan un adaptador Docker simulado; la conmutación real exige los contenedores y credenciales del servidor.

## Tráfico, mensajes y límites

La API Express mide peticiones observadas, conexiones en curso, abandonos, 4xx, 5xx, 429, latencia media y P95 aproximado (histograma de intervalos). Agrupa por familias fijas de rutas; no almacena rutas con identificadores, queries, cabeceras ni cuerpos. Incluye las consultas del monitor y las peticiones rechazadas dentro de Express. No ve el tráfico rechazado por Traefik. Las ventanas de 60 segundos tienen resolución de un segundo; las series cubren hasta 60 minutos, con minuto actual parcial. Los contadores se reinician con cada proceso y no agregan réplicas.

Moonbot publica recursos mediante `/api/status`. Solo se proyectan CPU, RAM, disco, uptime y versión; se descartan logs e historial crudo. Son valores del entorno visible a psutil, no uso relativo a cuotas Docker. Las cuotas de memoria, CPU y procesos, reinicios y OOM se leen de Docker inspect. `Sin límite explícito` no significa recursos físicos infinitos.

Para añadir los contadores que faltan en Moonbot, desde este repositorio:

```sh
python integrations/moonbot/install.py /ruta/al/checkout/moon-multibot
python -m unittest discover -s integrations/moonbot -p 'test_*.py'
```

Para probar también el adaptador HTTP real de Moonbot con respuestas simuladas, asignar `PYTHONPATH` al checkout instrumentado y ejecutar `python integrations/moonbot/verify_wiring.py`. Comprueba respuestas 429, reintentos, timeout y JSON inválido sin enviar mensajes ni contactar Telegram.

El instalador comprueba los puntos de integración antes de escribir, rechaza instalaciones repetidas y comprueba sintaxis. Revisar los cambios en el checkout de Moonbot y desplegarlo en ambos contenedores. Añade `core/operations_telemetry.py`, observación en `telegram_api_call` y `GET /api/telemetry/operations`, protegido por el JWT existente. No arranca bots ni modifica credenciales.

La instrumentación cuenta intentos HTTP a Telegram, incluidos reintentos, errores, 429, timeouts y máximo `retry_after`. Los enviados se cuentan por mensajes confirmados en las respuestas de envío/copia/reenvío, incluidos álbumes. Recibidos cuenta mensajes nuevos devueltos por `getUpdates`, y updates incluye otros eventos. Deduplica las últimas 10.000 entregas por hash de bot y update_id; varios bots que reciben el mismo mensaje cuentan como entregas diferentes. No equivale a mensajes únicos entre bots ni a procesamiento completado. No cubre webhooks ni llamadas que eviten `telegram_api_call`. Long polling se incluye en la latencia; la espera de reintento queda fuera. El módulo conserva únicamente contadores y claves de deduplicación en memoria, sin contenido de mensajes.

Los límites de Telegram mostrados son referencias de envío publicadas en su [FAQ oficial](https://core.telegram.org/bots/faq#my-bot-is-hitting-limits-how-do-i-avoid-this), consultada el 21/09/2026. No se aplican a recepción ni a todas las llamadas API, y no se calcula un porcentaje global ficticio de cuota restante. La pantalla no añade throttling ni cambia configuración de difusión de pago.

## Ping de centros de datos y CDN

### Transporte y ubicación

El desplegable CDN regionales cita el anuncio oficial de 23/07/2017 como cobertura histórica de mejora de descargas (Sudamérica, Turquía, Indonesia, India, Irán e Irak). No confirma ciudades, direcciones operativas ni disponibilidad actual. NetworksDB asocia 91.108.20.0/22 a Azerbaiyán, sin confirmar Bakú o capacidad. No hay evidencia en las fuentes aportadas para presentar Bakú, Teherán, Yakarta, Estambul, São Paulo o Buenos Aires como nodos medidos. Referencias: https://telegram.org/blog/encrypted-cdns y https://networksdb.io/ip-addresses-of/telegram-messenger-inc.

Moonbot `v18.23.17-alpha.2` amplía de 10 a 32 las conexiones retenidas por el pool HTTPS de cada bot durante ráfagas. Ya existía reutilización con Requests; este cambio evita descartar tantas conexiones al superar diez llamadas concurrentes. No impone límite de concurrencia, no añade reintentos automáticos ni altera TLS/proxies. El último 429 se devuelve inmediatamente con `retry_after`; el bucle getUpdates respeta esa espera antes de volver a consultar. No garantiza menor RTT de red.

La API web consulta recursos/operaciones y balanceo en paralelo y libera los cuerpos HTTP fallidos antes de reintentar lecturas. Las ubicaciones DC son referencias regionales de la documentación de Pyrogram, no geolocalización en vivo: DC1/DC3 Miami, DC2/DC4 Ámsterdam, DC5 Singapur. CDN y Bot API quedan como ubicación no confirmada. Configurar `MOON_API_LOCATION` con la ciudad/región real del despliegue para identificar el origen de las mediciones; no se infiere a partir de IPs privadas o de la ubicación del navegador.

Para comparar antes/después, usar la misma máquina, ruta y carga: RTT TCP mide apertura; la latencia Telegram incluye long polling. Observar latencia de respuestas, errores y 429 por separado. No se fuerza una IP/DC diferente para Bot API ni se reducen las esperas de Telegram. Un traslado de hosting o un servidor Bot API local requiere mediciones y configuración de despliegue específica.

El panel incluye un inventario desplegable de los 9 rangos IPv4 y 5 IPv6 publicados en `https://core.telegram.org/resources/cidr.txt`, consultados el 21/09/2026, y enlaza la referencia NetworksDB aportada por el usuario. El inventario es una instantánea documentada, no un descubrimiento de servidores: no asigna un ping al rango, no escanea IPs y no deduce ubicación o función a partir del registro de organización.

`GET /moonbot-admin/cluster/network` exige la misma autenticación administrativa y mide apertura TCP al puerto 443 desde el proceso Express (incluye DNS para dominios). Usa exclusivamente nueve destinos fijos: cinco DC de producción, un alternativo de DC2, dos CDN públicos de medios observados en Telegram News y Bot API. No acepta IPs, dominios ni puertos del navegador. Las direcciones DC se verificaron en el [código oficial de Telegram Desktop](https://github.com/telegramdesktop/tdesktop/blob/dev/Telegram/SourceFiles/mtproto/mtproto_dc_options.cpp); los hosts CDN `cdn1.telesco.pe` y `cdn4.telesco.pe` se observaron en `https://t.me/s/telegram` el 21/09/2026.

Las peticiones concurrentes comparten una medición y caché de 30 segundos, con timeout de 2,5 segundos por destino y máximo 60 muestras en memoria. Solo mide mientras se solicita el panel. Muestra última/media/mínima/máxima latencia y conexiones correctas sobre intentos. No es ICMP, pérdida de paquetes, validación TLS ni ping del protocolo MTProto, y no identifica el DC actual de una cuenta o los CDN cifrados asignados dinámicamente. Los fallos pueden originarse en la red del servidor; `EACCES/EPERM` se muestran como bloqueo local. La vista previa utiliza muestras ilustrativas y no abre conexiones.

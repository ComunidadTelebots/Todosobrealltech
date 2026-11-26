# Observabilidad de Todosobrealltech

Grafana vive en `/observabilidad/`. Prometheus recoge métricas Linux y el
inventario Docker y systemd. Loki recibe una muestra acotada de los registros
Docker y los avisos, errores y mensajes críticos de journald. El panel incluye
históricos de CPU, RAM, disco y red, un inventario con el propósito de cada
contenedor conocido y un filtro de logs por origen y servicio.

El acceso a Grafana requiere una cuenta propia. No hay registro público ni
acceso anónimo. Traefik sirve solo Grafana. Loki recibe los registros por
loopback. El servidor web no recibe el socket Docker ni credenciales del VPS.
El recolector local puede leer Docker y journald. Excluye las líneas que
parecen contener secretos y elimina correos y cadenas de consulta. Los logs
se conservan 7 días y las métricas hasta 15 días, con un límite de 2 GB.

## Instalación en el VPS

Desde este directorio:

1. Crear `/etc/alltech-observability` (permisos 0750 y propietario root).
   Guardar una contraseña aleatoria en `grafana-password` (UID 472, 0400) sin mostrarla. Grafana la usa al inicializar su base de datos.
2. Crear `/var/lib/alltech-observability/metrics` (0755) e instalar
   `collect.py` y `purpose.json` en `/opt/alltech-observability`, bajo root.
3. Arrancar con `docker compose up -d`. Verificar que los cinco contenedores
   arrancan y que una sesión sin credenciales es redirigida al login.
4. Inicializar una sola vez el inventario de referencia con
   `python3 /opt/alltech-observability/collect.py --initialize-baseline`.
   Revisar ese fichero con el dueño del servidor. Tras autorizar un nuevo
   servicio, actualizar su propósito y añadirlo al inventario de referencia.
5. Instalar la unidad y el temporizador en `/etc/systemd/system` y activar
   `alltech-observability.timer`. Verificar Prometheus, los registros en Loki
   y el panel servido a través de HTTPS.

## Avisos y límites

El panel muestra servicios Docker nuevos que siguen en marcha, nombres de contenedor
con cambios en su definición Docker, unidades systemd
activas fuera del inventario, contenedores con healthcheck fallido, errores de
systemd, pérdida del recolector y falta de espacio. Esta primera versión no
audita cada ejecución de procesos ni integra un canal externo de notificaciones. Alertmanager recibe y agrupa
los avisos de Prometheus y está disponible dentro de Grafana para revisarlos
y silenciarlos.
El inventario inicial registra lo observado en el servidor y requiere validación
del propietario para distinguir servicios deliberados de servicios heredados.

## Tor y Snowflake

Snowflake transporta conexiones WebRTC hacia la red Tor; su tráfico de usuarios
externos forma parte de su función. No necesita un panel web ni montar el socket
Docker. Deben mantenerse el modo de red y los puertos UDP que exige el puente.
El contenedor de servicios onion usa una red independiente y configura oniones
con un `torrc` de solo lectura. Sus claves permanecen en el volumen propio.

El VPS fija la imagen Snowflake por digest, usa el UID 65534, descarta
capacidades, bloquea la elevación y monta su raíz en solo lectura.
Se mantiene la red de host para el tráfico WebRTC.

El inventario distingue función, estado y origen de los logs. Para confirmar una
build, registrar repositorio, commit, imagen o digest y configuración efectiva.
Las etiquetas flotantes no identifican un binario de forma reproducible. Antes
de recrear un servicio de Tor, validar la imagen, las capacidades y el acceso a
los archivos de estado con su Compose, y verificar continuidad tras el cambio.

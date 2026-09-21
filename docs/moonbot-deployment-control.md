# Actualización y control de tráfico de Moonbot

El panel Balanceo y contenedores permite al creador preparar imágenes, detener o arrancar Docker y pausar, reanudar o trasladar bots de la Bot API. Los cambios requieren confirmación en la interfaz. Los ejemplos locales nunca ejecutan operaciones reales.

## Preparación

La API necesita acceso al socket Docker existente, `MOON_CLUSTER_NODES`, `MOON_ADMIN_API_KEY` y un archivo persistente `MOON_CLUSTER_STATE_FILE`. Una sola API escritora debe controlar el clúster; no ejecutar Compose, actualizadores automáticos ni operaciones Docker externas en paralelo. Las URL de nodos, nombres de contenedores y versiones proceden exclusivamente de la configuración del servidor.

`MOON_CLUSTER_RELEASES` admite hasta 30 versiones autorizadas:

```json
[{"id":"alpha-1","label":"Alfa 1","image":"ghcr.io/organizacion/moonbot@sha256:DIGEST_REAL_DE_64_CARACTERES"}]
```

Sustituir el ejemplo por una imagen real. No se aceptan etiquetas mutables como latest. El navegador envía únicamente el identificador. El motor Docker debe poder descargar la imagen; el panel no recoge credenciales del registro. Las imágenes privadas que requieran autenticación adicional no están soportadas por este adaptador.

## Actualizar

1. Seleccionar una versión y una reserva detenida. Si se actualiza el principal, primero derivar todo el servicio con Cambio de contenedor o detenerlo explícitamente.
2. Descargar y verificar el digest. Se vuelve a comprobar que la reserva está detenida.
3. Conservar el contenedor anterior con nombre `-previous-...` y reinicio automático desactivado. Crear la nueva reserva detenida, conservando configuración, redes, credenciales internas y volúmenes existentes. No se envían esos secretos a la web.
4. Activar con Cambio de contenedor: para el origen, arranca el destino y comprueba salud. Si el destino falla, intenta restaurar el origen.

La actualización conserva el contenedor anterior, pero no hace copia de seguridad de los datos. Las migraciones de una imagen nueva pueden impedir volver a una versión antigua; comprobar compatibilidad y respaldo antes de activarla. Los contenedores anteriores no se borran automáticamente. Actualizar también la configuración Compose declarada para evitar que una ejecución posterior revierta la imagen. No se soportan servicios Swarm ni espacios de nombres compartidos mediante `container:`.

## Control por Docker

Detener tráfico para el contenedor y espera confirmación. Si es el principal, la API persiste el estado pausado y deja de reenviar peticiones a una URL alternativa. Arrancar principal exige que los demás nodos estén detenidos. El traslado completo utiliza Cambio de contenedor. Parar Docker puede interrumpir trabajo en curso; no es una garantía de entrega exactamente una vez.

## Control por bot

Desplegar el código nativo de control y configurar en cada Docker:

```dotenv
MOON_TRAFFIC_CONTROL_ENABLED=true
MOON_NODE_ID=identificador_igual_al_catalogo
MOON_TRAFFIC_DEFAULT_PAUSED=true
MOON_TRAFFIC_BOOT_PAUSED=true
```

Los estados se guardan en `data/traffic-<MOON_NODE_ID>.json`, en un volumen persistente. Los IDs deben ser únicos y coincidir con el catálogo. Activar explícitamente `MOON_TRAFFIC_CONTROL_ENABLED=true` habilita el control; sin esa opción o sin `MOON_NODE_ID` se conserva el comportamiento anterior y el endpoint de control responde no disponible.

Arrancar con bots pausados requiere esas cuatro variables y TDLib desactivado. Todos los bots nuevos y los previamente habilitados arrancan pausados. Después se puede reanudar uno desde la web. La API consulta todos los nodos que Docker identifica como ejecutándose y rechaza la activación si otra copia del mismo bot admite tráfico, tiene peticiones en curso o no puede confirmar su estado. Un nodo Docker inaccesible también bloquea esa comprobación.

Pausar un bot persiste la decisión, deja terminar el lote ya admitido y sus llamadas anidadas, y bloquea nuevos lotes y llamadas de la Bot API. Derivar exige que el token ya esté configurado en ambos nodos; nunca se transporta el token por la interfaz. Espera hasta 120 segundos a que el origen quede pausado y sin operaciones, transfiere el último offset de su bucle y activa el destino. Si hay un error o respuesta incierta al activar el destino, no reactiva automáticamente el origen. Revisar ambos estados antes de reintentar. No garantiza entrega exactamente una vez ni sincroniza las bases de datos de dos Docker.

Los bots con TDLib no admiten pausa o traslado individual: TDLib tiene un ciclo de conexión y watchdog independientes. La interfaz los identifica y ofrece control del Docker completo. Los plugins que accedan a Telegram fuera del cliente instrumentado no quedan cubiertos por la pausa individual; utilizar la parada Docker para un corte completo.

## Operaciones e interrupciones

`POST /moonbot-admin/cluster/operations` devuelve 202 y un identificador; la consulta habitual del panel muestra progreso, error y finalización. Solo permite las acciones fijas publicadas por la interfaz. Una operación se ejecuta por vez, también respecto a la conmutación. La API debe mantenerse ejecutándose durante el trabajo.

Si se reinicia durante una operación, queda marcada como interrumpida y bloquea nuevas mutaciones. Un operador debe inspeccionar el contenedor original, cualquier `-previous-...`, el estado real de los bots y el último paso registrado en el archivo del clúster. Tras resolver la situación, detener la API y cambiar el estado de `job.status` de `running` a `failed`, conservando la evidencia, antes de reiniciarla. No basta con reintentar a ciegas.

El despliegue y sus permisos se configuran aparte. No se han ejecutado actualizaciones ni pausado bots reales al desarrollar esta interfaz.

## Ping entre nodos

Configurar `MOON_PEER_NODES` en cada Moonbot con una lista de `{ "id": "otro-nodo", "url": "http://nombre-docker:5000" }`, y `MOON_NODE_ID` con su identidad. Son destinos administrados en el servidor, no URLs recibidas del navegador. El endpoint interno autenticado publica mediciones de conexión TCP desde ese Docker a sus pares. Renueva en segundo plano cada 30 segundos, con hasta 12 destinos y cuatro conexiones simultáneas. El tiempo incluye resolución DNS; el timeout de conexión no limita la resolución del sistema. Si una resolución se bloquea, no lanza nuevos lotes mientras el anterior siga en curso.

La web indica dirección, milisegundos, hora, destino detenido, fallo o muestra caducada (60 segundos). Los bots de un mismo proceso no tienen ping entre sí. Por separado, cada bot muestra la media de respuesta de la API de Telegram en 60 segundos, incluyendo long polling, errores y reintentos; no es ICMP ni un indicador puro de latencia de red.

Configurar el identificador y los pares para medir ping no activa la pausa de bots: requiere además habilitar explícitamente MOON_TRAFFIC_CONTROL_ENABLED.

## Mapa de workers

Cada worker del mapa representa un Docker configurado, con su inventario de bots dentro. La API consulta la telemetría de cada Docker en ejecución; los porcentajes comparan llamadas de sus ventanas recientes de 60 segundos y se ocultan si faltan mediciones. No representan saturación de CPU. La ayuda entre workers se realiza mediante traslados manuales, sin autoescalado. El gestor del clúster coordina controles y el destino de la web; no es un receptor central de mensajes de Telegram. Cada bot mantiene su conexión Bot API o TDLib.

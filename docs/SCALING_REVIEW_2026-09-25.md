# Capacidad de Moonbot y Todosobrealltech

## Referencia y alcance

Se revisaron fotogramas de todo el vídeo local de Rick the Engineer (2:35),
incluidos sus diagramas y subtítulos visibles. No se transcribió el audio completo.
La secuencia propone identificar cuellos de botella, caché, almacenamiento de
archivos, CDN, colas, redundancia y observabilidad. También desaconseja añadir
componentes sin necesidad demostrada. Sus cifras de usuarios son ilustrativas:
no son una estimación de capacidad de este proyecto.

## Cambios implementados localmente

- API: las lecturas del panel autorizado comparten una recogida de estado en
  curso y un resultado durante 2 segundos por proceso. Los permisos siguen
  comprobándose por petición. No se cachean respuestas de autenticación ni
  operaciones. Inicio, cambios persistidos y final de operaciones invalidan la
  lectura; se descartan recogidas que cruzan una invalidación.
- API de desarrollo: las seis familias independientes de telemetría se consultan
  en paralelo. Se incorpora la corrección de tiempos de espera de Docker que
  ya tenía la preparación estable: inspección 2 s, parada 45 s.
- Panel Todosobrealltech: reintentos progresivos con variación aleatoria hasta
  aproximadamente 60 s; conserva el bloqueo de controles ante errores. Muestra
  consultas realizadas y lecturas reutilizadas por el proceso API.
- Moonbot: limpieza de ventanas estadísticas una vez por segundo, en lugar de
  reconstruirlas con cada evento HTTP/Telegram. Conserva contadores, bloqueo de
  concurrencia y caducidad de 60 segundos.
- Web propia de Moonbot: evita consultas de estado solapadas, pone un tiempo
  máximo de 10 s y reduce reintentos hasta 30 s. Las consultas periódicas de IA
  y moderación se limitan a su pestaña visible. El dashboard deja de consultar
  estado cuando está oculto o se está viendo otra sección.
- Nginx de la web principal: compresión de CSS/JS/SVG y caché de un año solamente
  para archivos generados con hash. HTML se revalida; API y datos privados no
  reciben esa caché. Configuración preparada, pendiente de `nginx -t` en Docker.

La preparación `.stable-moonbot-fix` conserva sus arreglos anteriores y recibe
también la caché compartida, el panel y la configuración estática. Estos cambios
nuevos no se han publicado en GitHub ni desplegado en Hostinger.

## Evidencia

- Suite API: 226 pruebas aprobadas. PocketBase no estaba disponible localmente;
  aparecen avisos de inicialización. No sustituye una prueba de integración con
  autenticación y base de datos reales.
- 1.000 lectores concurrentes: una recogida, dos inspecciones Docker para los
  dos nodos simulados. Una conmutación invalida el resultado anterior.
- Invalidación durante una lectura y recuperación tras errores: comprobadas.
- Moonbot: 7 pruebas de telemetría, incluida concurrencia de 10.000 eventos;
  2 pruebas de polling de la web; comprobación de sintaxis JavaScript.
- Preparación estable: 13 pruebas del controlador aprobadas.
- Compilación Vite de la web principal aprobada.
- Medición local del contador HTTP con 60 intervalos precargados, reloj fijo y
  100.000 eventos: versión anterior 529,54 ms; nueva 168,14 ms (3,15 veces).
  Una ejecución en este ordenador, no un benchmark del servidor completo.

## Siguientes límites que medir

Antes de aumentar réplicas, medir p50/p95/p99, errores, CPU, memoria, espera de
SQLite y profundidad de colas con tráfico representativo y bots de prueba.
La caché es por proceso; varias réplicas de API siguen recogiendo sus propias
estadísticas. No habilita por sí sola varios controladores Docker concurrentes.

La cola actual de Moonbot es una lista en memoria y procesa tareas con el primer
bot activo. Convertirla en una cola de trabajo distribuida exige vincular cada
tarea a su bot, persistencia, deduplicación y recuperación ante fallos antes de
repartirla entre contenedores. No se ha cambiado ese contrato en esta entrega.

No se ha activado replicación de SQLite/PocketBase, un CDN externo ni nuevas
réplicas. Tampoco se ha cambiado el transporte Telegram o los plugins. La prueba
de carga extremo a extremo y la validación del worker con Telegram siguen
siendo necesarias para declarar una capacidad real de usuarios.

# Changelog - TodoSobreAllTech

### Roadmap Telegram React 0.0.639 - 2026-08-03
- Registra las campañas aprobadas de TodoSobreAllTech insertadas entre publicaciones de canales.
- Documenta la rotación pública, el clic medido y la exclusión de grupos y conversaciones privadas.
- El catálogo público queda en 30 implementadas, 6 parciales y 4 pendientes.

### Roadmap Telegram React 0.0.638 - 2026-08-03
- Añade una matriz visible con las 11 familias y 43 versiones de diseño registradas en Telegram React.
- Documenta que los componentes funcionales son compartidos por todas las apariencias y versiones.
- Explica los dos modos disponibles: todas las funciones actuales o solo las funciones propias de la época, manteniendo la API moderna.
- Publica evidencia directa del registro de diseños, selector de versiones y controles de compatibilidad.
- Marca la consulta de Comunidades enlazadas como implementada tras verificar el descubrimiento MTProto y la apertura desde los detalles del chat.
- El catálogo público queda en 29 implementadas, 6 parciales y 4 pendientes.

### Roadmap Telegram React 0.0.637 - 2026-08-03
- Marca como implementadas la grabación real de mensajes de voz y el navegador interno multipestaña seguro.
- Registra compartir pantalla y cámara mediante el transporte de presentación de chats de voz.
- Actualiza llamadas grupales: audio, administración y presentación funcionan; solo queda parcial el vídeo nativo SIM/FID.
- El catálogo Telegram React alcanza 28 funciones implementadas, 6 parciales y 5 pendientes.

### Roadmap Telegram React 0.0.633–0.0.636 - 2026-08-03
- Actualiza `/roadmap` con Telegram Business, efectos de mensajes, Mensajes guardados, canales similares y perfiles de descarga automática ya verificados.
- Registra la conexión de audio WebRTC a chats de voz, micrófono, mute, participantes, grabación e invitaciones.
- Muestra el estado parcial real de llamadas grupales: faltan publicación de vídeo y presentación de pantalla.
- Incorpora al catálogo web la evidencia técnica de cada función y la versión actual `0.0.636`.

### Robustez e interfaz completa del captcha multicanal - 2026-08-03
- Corrige respuestas HTML inesperadas de la API sin provocar el error `Unexpected token '<'`.
- Normaliza respuestas antiguas de canal único y evita que desaparezca la selección tras guardar.
- Evita solicitudes automáticas de apelación duplicadas durante una actualización del grupo.
- Completa por grupo la búsqueda y los banners con foto, riesgo, estado del bot y acciones de unión o selección.

### Recomendaciones de canales con revisión de contenido - 2026-08-01
- Los banners del captcha muestran la foto pública, identidad y bot asociado de cada canal.
- Moonbot retira de las recomendaciones los canales con contenido observado de alto riesgo.
- El panel muestra la cobertura del análisis y su puntuación sin bloquear los canales ya elegidos manualmente por el master.
- Incorpora buscador, acción rápida para añadir canales y enlace «Unir bot» cuando falta una instancia en el canal.

### Captcha obligatorio multicanal - 2026-08-01
- El master puede exigir hasta diez canales globales simultáneos desde tarjetas seleccionables.
- Cada grupo dispone de su propia lista de hasta diez canales locales, independiente de la lista global.
- Web y Hub recomiendan solo canales donde está unido el bot correspondiente y conservan la edición manual.
- Los administradores de grupo gestionan únicamente su lista local; la configuración global continúa reservada al master.

### Verificación visual del captcha global - 2026-07-31
- El panel master muestra `Sí/No` para cada usuario y un indicador general de verificación completa.
- El canal global predeterminado es `@TodoSobreAllTech` y la comprobación automática se realiza cada 12 horas.

### Backfill exclusivo Bot API 10.2 - 2026-07-31
- El backfill edita con el mismo Rich Markdown 10.2 usado por las publicaciones nuevas.
- Se elimina la degradación visual a HTML: si la edición enriquecida no está disponible, el mensaje permanece intacto y pendiente.
- Instant View y la tarjeta comunitaria conservan el mismo diseño en publicaciones nuevas y recuperadas.

### Backfill e Instant View coherentes - 2026-07-31
- Las publicaciones enriquecidas fijan explícitamente la previsualización de Instant View sin perder el diseño compacto ni la campaña comunitaria.
- El backfill elimina paréntesis huérfanos, enlaces IFTTT y fragmentos repetidos antes de editar publicaciones antiguas.

### Barra vertical de canales en NoticiasWeb3 - 2026-07-31
- NoticiasWeb3 incorpora una barra publicitaria vertical izquierda con canales de Telegram aprobados y rotación comunitaria.
- La barra es independiente de AdSense, se oculta en pantallas estrechas y conserva los anuncios superior y lateral derecho existentes.
- La API permite solicitar exclusivamente campañas con destino a canales públicos de Telegram.

### Revisión administrativa del directorio de canales - 2026-07-31
- El directorio público muestra exclusivamente canales aprobados por un administrador autorizado.
- Los administradores de canal pueden solicitar la inclusión desde el Hub, pero no publicarse directamente.
- El master puede aprobar desde el Hub y los administradores web desde la ficha del canal en TodoSobreAllTech.
- Los canales pendientes, rechazados, retirados o antiguos sin revisar quedan ocultos de listados, fichas y rankings.

### Aprobación master obligatoria para publicidad - 2026-07-31
- Toda campaña creada o editada queda pendiente aunque la prepare el propio creador.
- Solo el master puede aprobarla desde el panel de anuncios de TodoSobreAllTech.
- Web, NoticiasWeb3, canal de Telegram y mensajes de bots aceptan únicamente campañas con aprobación explícita.
- Pausar conserva la aprobación, pero una campaña pendiente o rechazada no puede reactivarse.

### Comunidades vinculadas al directorio de canales - 2026-07-31
- Las fichas de `canales.todosobreall.tech` muestran la comunidad de Telegram detectada por Moonbot y sus canales relacionados.
- El directorio identifica visualmente los canales que pertenecen a una comunidad.
- Los anuncios incluidos en respuestas informativas del bot enlazan a la ficha pública del canal y conservan medición propia de clics.
- Las respuestas privadas y las operaciones sensibles de moderación, captcha y seguridad quedan libres de publicidad.

### Conexión interna Moonbot tolerante al arranque - 2026-07-31
- Reintenta automáticamente las lecturas internas cuando Moonbot todavía está arrancando tras una reconstrucción.
- Mantiene las acciones administrativas POST en un único intento para impedir operaciones duplicadas.
- Evita que el dashboard y el mapa lingüístico conviertan un fallo temporal de conexión en paneles vacíos.
- Hace que Nginx vuelva a resolver dinámicamente API y PocketBase cuando Docker recrea sus contenedores, sin reinicios manuales de `web`.
- Conserva el borrador del canal global mientras el progreso se actualiza y muestra la comunidad asignada en una tarjeta visual con nivel, periodicidad y ayudas contextuales.

### Publicador Telegram recuperable - 2026-07-31
- Convierte la publicación de noticias en una cola persistente: el artículo se guarda primero y Telegram se reintenta después de timeouts o reinicios.
- Recupera automáticamente publicaciones fallidas de las últimas 48 horas sin volver a importar ni duplicar la noticia.
- Añade timeout, reintentos exponenciales y tratamiento específico de errores 429/5xx de Bot API.
- Impide que dos ciclos de RSS se solapen y publiquen dos veces el mismo artículo.
- Conserva el resumen breve, Instant View, Rich Markdown, anuncio comunitario medible y el texto y botón añadidos posteriormente por Inside Ads.

- Añade en `/admin` un ajuste master independiente para el canal obligatorio global, captcha estricto y reverificación periódica de todos los grupos.
- Mantiene en cada grupo un canal obligatorio local adicional; el captcha exige tanto el canal global como el local cuando ambos están configurados.
- Sincroniza y persiste estos ajustes en Moonbot mediante la conexión interna autenticada, sin depender del navegador.

- El inicio del captcha global admite campañas grandes sin devolver un falso error de API: amplía el tiempo del POST y recupera automáticamente el estado persistido si se pierde la respuesta inicial.
- El panel administrador deja de bloquear toda la pantalla indefinidamente: aplica un límite de diez segundos por fuente y muestra los datos parciales disponibles.
- Los canales RC, beta y alfa esperan también a que PocketBase esté saludable antes de servir sus interfaces.
- Unifica todas las consultas de administración, bloqueos y mapa lingüístico sobre `MOONBOT_INTERNAL_URL`, con destino interno seguro `http://moonbot:5000` aunque la variable falte; elimina caídas silenciosas a la URL pública.
- Añade un `.dockerignore` común para impedir que dependencias locales antiguas sobrescriban las instaladas por `npm ci`; corrige la resolución de `@remix-run/router` en NoticiasWeb3 y reduce el contexto y el tiempo de compilación.
- El despliegue espera a que PocketBase termine las migraciones y responda correctamente antes de iniciar API, worker y web, evitando campos o registros ausentes tras una actualización.

### Compatibilidad con Inside Ads e IFTTT - 2026-07-31
- Los posts nuevos de `@TodoSobreAllTech` contienen únicamente el titular, una frase breve y el enlace a NoticiasWeb3.
- El backfill deja de sustituir esos mensajes por el artículo completo y conserva el bloque y los enlaces añadidos por `@InsideAds_bot`.
- Las ediciones de posts externos esperan cinco minutos y utilizan el texto vivo del canal; si no puede leerse, se omite la edición para no borrar publicidad.
- Los enlaces cortos de IFTTT se reconocen como fuente, se importan en NoticiasWeb3 y dejan de ser descartados por confundir Inside Ads con contenido patrocinado.
- Cuando Inside Ads ya ha insertado una campaña, el worker no vuelve a editar el mensaje y conserva tanto el texto publicitario como su botón original.
- Añade tras «Leer en NoticiasWeb3» una tarjeta compacta de campañas TodoSobreAllTech; rota desde el mismo panel web y mide clics, ubicación Telegram y país mediante el enlace propio antes de que Inside Ads incorpore su anuncio.
- Las publicaciones nuevas usan `sendRichMessage` y Rich Markdown de Bot API 10.2 con encabezado, divisor y cita publicitaria nativos, sin imágenes externas; conservan un fallback HTML para servidores Telegram anteriores.
- La campaña comunitaria adopta una tarjeta horizontal nativa: información a la izquierda y CTA medible a la derecha, inspirada en el formato de anuncios de la web.
- Cada noticia y campaña comunitaria incorpora un panel privado con filtros por 24 horas, 7/30/90 días, país, hora y día.
- Las visitas web y los clics se registran por país sin guardar IP ni identificadores personales.
- Las impresiones de publicaciones del canal proceden del contador oficial de Telegram, sincronizado cada quince minutos; el worker deja de contabilizar como impresión la mera consulta del catálogo.

### Dependencias y compilaciones reproducibles - 2026-07-31
- Actualiza Canales y NoticiasWeb3 a Vite 7.3.6, `@vitejs/plugin-react` 5.2.0 y React Router 7.18.2, eliminando las versiones afectadas por lectura de archivos, redirección abierta y XSS.
- Regenera los lockfiles de API, ComunidadTelebots, Resistencia Censura, TodoSobreGameplays y scripts con `js-yaml`, PostCSS, esbuild, Babel e `ip-address` corregidos.
- Añade un lockfile propio a Canales y sustituye instalaciones Docker no deterministas por `npm ci` o por el lockfile raíz del monorepo.
- Actualiza GitHub Actions a `checkout@v7` y `setup-node@v7` y corrige el único incumplimiento previo del lint de la API.
- Se conserva React Router 7.18.2 como última versión publicada; la alerta residual afecta al modo RSC, que estas aplicaciones SPA no habilitan. La otra alerta residual procede de `brace-expansion` dentro del lint de desarrollo y todavía no dispone de una actualización compatible aguas arriba.

### Directorio unificado de bloqueos - 2026-07-31
- `/admin` reúne los usuarios que Moonbot registró como detectados por CAS, los GBAN, los baneos locales y los bloqueos web.
- El contador CAS ya no representa el export completo: cuenta únicamente detecciones registradas por Moonbot.
- Añade búsqueda y filtros por origen, conserva la separación entre bloqueos Telegram y cuentas web y evita escrituras directas desde el navegador.
- Corrige la validación manual y traduce los controles principales del directorio.
- Añade al master un control global para iniciar captcha en todos los grupos únicamente a usuarios que todavía no lo superaron, con porcentaje y métricas en directo.
- Conserva la campaña en Moonbot y muestra al reabrir `/admin` el estado por grupo, usuarios restantes y cada protocolo pendiente.

### Verificación Telegram para administradores web - 2026-07-31
- Las invitaciones y elevaciones dejan el acceso pendiente hasta verificar por mensaje privado la cuenta de Telegram indicada.
- Genera códigos de un solo uso con quince minutos de validez y almacena exclusivamente su huella criptográfica.
- El bot confirma servidor a servidor el ID y username reales del remitente antes de activar el rol `admin` y vincular Telegram.
- La web permite comprobar el estado, renovar la sesión autenticada y entrar al panel únicamente después de la confirmación.
- El Hub reconoce el administrador web por su cuenta PocketBase verificada y muestra un panel propio, sin conceder controles master ni permisos de grupo.

### Invitaciones y elevación de administración web - 2026-07-31
- Permite al master crear enlaces de acceso caducables, revocables y de uno o varios usos para convertir cuentas en administradores de la web.
- Los enlaces guardan únicamente una huella SHA-256 del token y se consumen de forma cerrada antes de aplicar la elevación.
- Añade una pantalla de aceptación que conserva el enlace durante el inicio de sesión o el registro.
- Permite al master elevar directamente usuarios existentes con motivo obligatorio y registro de auditoría.
- Separa expresamente el rol administrativo web de los permisos de grupos Telegram y bloquea desde PocketBase la autoelevación o la asignación de roles durante el registro.

### Gateway autenticado para canales web - 2026-07-31
- Protege los bundles RC, beta y alpha completos —HTML, JavaScript y recursos— mediante ForwardAuth antes de servirlos.
- Emite una sesión breve en cookie `HttpOnly`, `Secure` y firmada con HMAC tras autenticar la cuenta en PocketBase.
- Fija el canal requerido en la ruta interna de cada middleware y no confía en cabeceras ni valores enviados por el navegador.
- Revalida en cada acceso la cuenta, su ID de Telegram, su estado y el canal asignado; cualquier fallo del backend deniega el acceso.
- Mantiene stable como canal público y deja los canales superiores desactivados hasta configurar el secreto y habilitar su publicación.

### Estructura de builds web por canal - 2026-07-30
- Mantiene `web` como despliegue stable predeterminado y aÃ±ade servicios opt-in separados para RC, beta y alpha.
- Cada imagen hornea su canal y versiÃ³n, mostrados permanentemente junto al nombre de la web.
- La etiqueta diferencia el bundle ejecutado del canal autorizado para la cuenta autenticada.
- Los servicios superiores permanecen internos y deshabilitados en Traefik hasta incorporar el gateway autenticado.
- Las respuestas de permisos y catÃ¡logos usan cachÃ© privada desactivada para impedir cruces entre cuentas o canales.

### Canales de funciones Alpha, Beta y RC - 2026-07-30
- AÃ±ade a las cuentas el canal progresivo `stable`, `rc`, `beta` o `alpha`, vinculado con su ID de Telegram.
- El creador puede asignar el canal desde el panel de cuentas y comprobar si Telegram estÃ¡ vinculado.
- La web y el Hub muestran solo las funciones permitidas simultÃ¡neamente por rol y canal.
- El backend envÃ­a el canal validado a Moonbot y ambos servicios vuelven a comprobarlo antes de ejecutar.
- El master conserva acceso completo al canal alpha; cualquier valor ausente o invÃ¡lido se reduce a stable.

### Permisos contextuales y centro unificado Moonbot - 2026-07-30
- Las funciones usan exclusivamente los roles existentes `user`, `group_admin`, `group_creator` y `master`.
- Las operaciones de grupo exigen seleccionar un grupo administrable y el servidor vuelve a validar y fijar su identificador.
- El master mantiene acceso completo; cada administrador o creador solo actÃºa sobre sus propios grupos.
- Unifica el catÃ¡logo en un solo panel emergente con flecha atrÃ¡s, selector de grupo y formularios derivados de `input_schema`.
- Bloquea cambios de grupo introducidos manualmente en el editor JSON y mantiene la autorizaciÃ³n cerrada por defecto.

### Interfaces completas por contrato y rol - 2026-07-30
- TodoSobreAllTech genera formularios para las 2.740 funciones activas usando el contrato entregado por Moonbot.
- Los usuarios ven únicamente herramientas de usuario; administradores, creadores y master reciben acceso acumulativo según su rol verificado.
- El servidor deriva el rol desde PocketBase, filtra el catálogo y vuelve a comprobar cada ejecución antes de enviarla a Moonbot.
- Añade controles específicos de texto, número, booleano y JSON, validación de obligatorios y un modo JSON avanzado.
- Los usuarios sin permisos administrativos disponen ahora de su propio centro de funciones dentro del dashboard.

### Seguridad web y 20 familias de formularios - 2026-07-30
- Actualiza Vite, React Router, PostCSS y Concurrently a revisiones compatibles y reduce avisos conocidos de dependencias.
- Valida los destinos de campañas para impedir redirecciones a esquemas peligrosos y normaliza enlaces profundos de Telegram.
- Sanitiza identificadores y colores antes de generar los estilos dinámicos de las gráficas.
- Añade formularios específicos para incidencias, flujos, delegación, abuso coordinado, copiloto, capacidad, lotes, espacios colaborativos, multimedia, informes, escalado, continuidad, confianza, campañas, intención, integraciones, bóveda, lectura fácil, sesiones y editorial.
- Integra esos formularios en el panel emergente existente, con flecha atrás, revisión JSON y ejecución autenticada.

### Formularios específicos y builds reproducibles - 2026-07-30
- Añade formularios seguros para sandbox, gobernanza, impacto, archivado y revisión de calidad.
- Mejora accesibilidad del popup y conserva la revisión JSON antes de ejecutar contratos verificados.
- ComunidadTelebots, Resistencia Censura y TodoSobreGameplays pasan a `npm ci` reproducible usando sus lockfiles.

### Formularios específicos Moonbot - 2026-07-30
- Nuevo centro de operaciones con formularios guiados para energía, antiabuso, migración, federación, continuidad y asistencia contextual.
- Cada operación se abre en un popup con flecha atrás, prepara el contrato JSON y exige revisión antes de ejecutarlo.
- Se conserva el registro genérico como respaldo para todas las demás funciones verificadas.

### Paneles emergentes del registro Moonbot - 2026-07-30
- Las funciones verificadas dejan de formar una lista larga y se agrupan automáticamente por ámbito operativo.
- Cada grupo abre una vista superior independiente con flecha de regreso, filtro por rol y contador de funciones.
- Cada función conserva su editor JSON y ejecución autenticada dentro de su panel, sin exponer operaciones a usuarios sin rol master.

### Seguridad de importaciones y diagnóstico proxy - 2026-07-30
- Las importaciones y escrituras de listas de bloqueados exigen ahora un usuario administrador o creador autenticado.
- Las pruebas de proxy dejan de estar expuestas sin autenticación, evitando su uso como escáner de la red interna.
- El cliente web conserva la compatibilidad adjuntando automáticamente el token Bearer disponible.

### Validación segura de creación Onion - 2026-07-30
- Se elimina la aceptación insegura de JWT decodificados sin comprobar su firma.
- Crear una Onion Web exige ahora validación real contra PocketBase y rol administrativo o creador.
- Se evita modificar el `authStore` superuser compartido con tokens suministrados por clientes.

### Registro por roles ampliado a 1.800 funciones - 2026-07-30
- Cada contrato queda clasificado para usuario, administrador de grupo, creador del grupo o master, con alcance y nivel de riesgo visibles.
- La web y el Hub incorporan filtros equivalentes por rol; el runtime impide ejecutar una capacidad por debajo de su rol mínimo.
- Se integran 100 funciones nuevas de analítica, privacidad, moderación, contenido, localización, lectura fácil, voz y notificaciones agrupadas.

### Descubrimiento de dominios Traefik para Onion Webs - 2026-07-30
- `/admin/onion-webs` detecta routers `Host(...)` mediante la API interna de Traefik y deduplica sus dominios.
- El panel muestra estado, TLS y servicio, compara el dominio con asociaciones existentes y permite crear una Onion Web con redirección HTTPS.
- La integración no monta el socket de Docker ni expone reglas completas o credenciales al navegador.

### Contadores reales del panel `/admin` - 2026-07-30
- `Total Bots` y `Active Onion Webs` se obtienen desde `/stats` mediante agregación autenticada en servidor.
- Un fallo de permisos en una colección del navegador ya no pone a cero todas las métricas ni bloquea el resto del panel.
- Los accesos Onion de los últimos 30 días se calculan en PocketBase sin exponer registros individuales.

### Conexión HTML con Moonbot restaurada - 2026-07-30
- El mapa lingüístico vuelve a consultar primero `http://moonbot:5000`, con la URL pública como respaldo controlado.
- Nginx devuelve un error JSON legible durante reinicios, evitando que la interfaz intente interpretar una página HTML 502 como datos.
- La web espera a que la API esté saludable al arrancar y valida el cuerpo de las respuestas antes de representarlo.

### Accesibilidad y localización verificadas - 2026-07-30
- El registro alcanza 1.700 funciones con 80 contratos adicionales para accesibilidad WebApp, revisión colaborativa y localización cultural.
- Se reutilizan seis implementaciones ya existentes mediante un único manifiesto, evitando IDs y APIs duplicados.
- El bloque supera 89 pruebas de registro, contratos e invariantes antes de publicarse en las interfaces master.

### Registro verificable ampliado a 1.620 funciones - 2026-07-30
- Se integran 120 contratos adicionales de incidentes, correlación temporal, revisión colaborativa, paneles, analítica y operación offline de la WebApp.
- Todos los contratos se registran mediante manifiestos permitidos, con API y funciones únicas, y quedan accesibles desde las interfaces master existentes.
- La verificación del bloque ejecuta 139 pruebas específicas y confirma 1.620 funciones registradas sin IDs duplicados.

### Centro ejecutable de funciones verificadas - 2026-07-30
- El panel master incorpora una pestaña para buscar, inspeccionar y ejecutar funciones registradas de Moonbot desde la web.
- La API de TodoSobreAllTech actúa como pasarela autenticada hacia el registro interno y nunca expone la clave administrativa al navegador.
- El runtime usa una lista explícita de manifiestos, valida argumentos y rechaza módulos, funciones o IDs no registrados.
- Los primeros 1.500 contratos verificados quedan disponibles de forma compartida para Moonbot, web y Telegram WebApp.

### Catálogo ampliado a 6.000 funciones sin nombres repetidos - 2026-07-30
- El roadmap incorpora 3.000 capacidades nuevas mediante contratos operación–recurso con nombres funcionales únicos.
- Cada ampliación tiene una clave estable y el validador rechaza capacidades repetidas antes de generar la web.
- Las nuevas entradas nacen como pendientes; solo pasarán a implementadas cuando exista código, integración y prueba específica para su recurso.
- El reparto queda equilibrado entre TodoSobreAllTech, Moonbot y Telegram WebApp sin duplicar una misma entrada por pantalla o contexto.

### Seguimiento verificable de tareas nuevas - 2026-07-30
- `/roadmap` muestra ahora las peticiones recientes con estado independiente: implementada, parcial o no implementada, junto con su evidencia técnica.
- Se reconocen como verificadas las campañas comunitarias de NoticiasWeb3, la portada y las comunidades; el catálogo pasa de 58 a 61 funciones comprobadas.
- Horario silencioso global, recordatorios persistentes y transcripción segura permanecen parciales hasta completar su integración con runtime, API e interfaces.
- Las siete ideas útiles auditadas en DBTeamV2 que todavía no existen se conservan como pendientes, sin presentarlas como código terminado.

### Campañas comunitarias en la web principal - 2026-07-30
- `todosobreall.tech` muestra ahora las campañas rotatorias de Telegram también en la portada, antes del contenido promocional general.
- Las impresiones y clics reutilizan el mismo endpoint medido por país y ubicación que NoticiasWeb3, evitando contadores paralelos o duplicados.
- Si Moonbot no está disponible se utiliza la campaña oficial rotatoria de respaldo.

### Colaboración, métricas y conector de cuentas - 2026-07-30
- El panel master incorpora hilos administrativos por cuenta con comentarios, menciones autorizadas, resolución, reapertura e historial inmutable.
- Las métricas de cuentas agregan eventos en una ventana móvil, deduplican IDs opacos y excluyen nombres, correos, IP e identificadores internos de los resultados.
- El conector interoperable exporta paquetes JSON v1, valida alias y campos compatibles y previsualiza importaciones sin aplicar cambios automáticamente.
- Las funciones nuevas se integran de forma aditiva y se preparan también para el Hub master de Moonbot.

### Búsqueda semántica, revisiones y aprendizaje de cuentas - 2026-07-30
- La búsqueda de cuentas interpreta intención, sinónimos, roles, estado, verificación y proxies con ranking explicable y sin servicios externos.
- Las revisiones administrativas admiten recurrencia diaria, semanal o mensual, prioridades y zonas IANA con cálculo correcto durante cambios de horario.
- El centro de aprendizaje incorpora seis lecciones, progreso persistente por creador, reanudación, navegación accesible y explicaciones contextuales.
- Las tres funciones se integran en el panel de cuentas sin retirar la búsqueda, el calendario local ni las herramientas existentes.

### Plantillas, sandbox y vista compacta de cuentas - 2026-07-30
- Las configuraciones de cuentas pueden guardarse como plantillas validadas y versionadas, con comparación previa antes de cualquier uso.
- El nuevo sandbox simula cambios de rol, congelación y proxy sobre copias, calcula diferencias y riesgos y garantiza cero efectos en PocketBase.
- El panel ofrece densidad cómoda o compacta persistente por creador, con estilos limitados exclusivamente al área de cuentas.
- Las implementaciones incluyen pruebas de inmutabilidad y seguridad y no sustituyen ninguna función anterior.

### Asistente, webhooks e idioma de cuentas - 2026-07-30
- El panel incorpora un asistente que prioriza anomalías, aprobaciones, recomendaciones y proxies degradados con explicaciones y confirmación manual obligatoria.
- Se añaden webhooks HTTPS firmados con HMAC para eventos de cuentas, bloqueo de destinos privados, activación, pausa, prueba individual y registro del último envío.
- Cada creador puede guardar el idioma y la dirección de lectura del panel de cuentas; se incluye soporte de derecha a izquierda para árabe sin alterar el resto de la web.
- Las tres funciones quedan vinculadas a pruebas y evidencias reales en el roadmap, sin retirar herramientas existentes.

### Recomendaciones, accesibilidad e informes de cuentas - 2026-07-30
- El servidor genera recomendaciones explicables y priorizadas por cuenta sin ejecutar acciones automáticas.
- El panel incorpora escala de texto, alto contraste, reducción de movimiento y lectura por voz acotados al área de cuentas.
- Los informes JSON o CSV se programan con zona horaria, se generan realmente en segundo plano y pueden pausarse, ejecutarse y descargarse desde el panel.
- Se completan tres funciones parciales con validación de destinatarios, horarios, zonas IANA y cambios de horario estacional.

### Comparador temporal de cuentas - 2026-07-30
- El panel compara altas en ventanas consecutivas equivalentes de 7, 30 o 90 días.
- Muestra valores actual y anterior, diferencia absoluta, porcentaje y dirección de tendencia calculados en servidor.
- Se añaden pruebas de límites temporales y se completa la función parcial del roadmap.

### Previsión explicable de altas - 2026-07-30
- El panel de cuentas proyecta las altas de los próximos 30 días usando ocho semanas de historial y mayor peso para las semanas recientes.
- Muestra intervalo estimado, tendencia, tamaño de muestra, confianza y explicación del cálculo.
- Se añaden pruebas deterministas y se completa la función predictiva parcial del roadmap.

### Flujo de aprobación de cuentas - 2026-07-30
- Las elevaciones al rol administrador generan una solicitud persistente en vez de aplicarse directamente.
- Solo creator puede aprobarlas, el solicitante no puede aprobar su propia petición y la cuenta creator permanece protegida.
- El panel permite aprobar o rechazar solicitudes y se añaden pruebas de separación de funciones.

### Detección explicable de anomalías de cuentas - 2026-07-30
- El panel identifica IDs de Telegram o correos duplicados, cuentas privilegiadas sin verificar, creator congelado y concentración anormal de proxies.
- Cada señal incluye gravedad, cuentas afectadas y una explicación visible; el análisis se calcula en el servidor con acceso administrativo.
- Se añaden pruebas deterministas y se completa la función crítica correspondiente del roadmap.

### Recuperación selectiva de cuentas - 2026-07-30
- El historial permite elegir y recuperar únicamente el rol o el estado congelado de una cuenta.
- La restauración exige una vista previa, protege la cuenta creator y registra un nuevo evento auditable con referencia al cambio original.
- Se añaden pruebas del plan de recuperación y la función parcial queda completada con evidencia en el roadmap.

### Privacidad reforzada de cuentas - 2026-07-30
- Los nombres, correos y direcciones proxy del panel de cuentas quedan ocultos por defecto cuando se activa el modo reforzado.
- El creador puede revelarlos únicamente durante la sesión actual y volver a ocultarlos de inmediato.
- La preferencia se configura desde Ajustes y completa una función que figuraba como parcial en el roadmap.

### Auditoría de configuración sensible - 2026-07-30
- El panel de cada grupo muestra los cambios reales de seguridad y moderación, con autor, origen, riesgo y campos afectados.
- La web comparte el historial generado por Moonbot con la MiniApp y evita duplicar registros cuando la configuración no cambia.
- Tres funciones parciales del roadmap pasan a implementadas con evidencia verificable.

### Estados claros del roadmap - 2026-07-30
- El roadmap separa todas las funciones entre implementadas, parcialmente implementadas y no implementadas.
- Las funciones no implementadas conservan el detalle de si están especificadas o únicamente propuestas.
- Se añaden contadores, filtros directos y la situación principal a la exportación CSV.

### Historial efectivo de permisos - 2026-07-30
- El panel de cada grupo conserva los cambios reales de permisos por bot sin duplicar comprobaciones idénticas.
- Web y MiniApp muestran cuándo apareció o se corrigió una carencia, qué permiso faltaba y quién comprobó el estado.
- Las tres implementaciones quedan enlazadas a su evidencia en el roadmap público.

### Roadmap verificable por evidencia - 2026-07-30
- Cada función completada incluye ahora los archivos que prueban su implementación real.
- Se corrigen siete falsos positivos del inventario: permanecen pendientes sin eliminarse del roadmap.
- Una validación automática bloquea IDs duplicados, estados incoherentes, texto mal codificado y funciones completadas sin evidencia.
- El roadmap y su exportación CSV muestran la evidencia técnica de las funciones verificadas.

### Validación continua y despliegue seguro - 2026-07-30
- GitHub Actions valida lint, pruebas de API y compilación de las seis webs sin utilizar credenciales reales.
- El despliegue se omite de forma segura cuando faltan los secretos del VPS y usa actualización `--ff-only` cuando están configurados.
- Se añaden pruebas del reescritor editorial y Dependabot para npm, Docker y GitHub Actions.
- Se corrigen tres errores detectados por ESLint en las herramientas administrativas de Moonbot.

### Publicación resiliente de NoticiasWeb3 - 2026-07-28
- Un timeout de Telegram ya no interrumpe la creación del artículo propio en PocketBase ni su ruta interna de NoticiasWeb3.
- El publicador continúa procesando el lote aunque la fuente completa o Telegram no respondan temporalmente.
- El guardado en PocketBase dispone de tres intentos con espera progresiva y comprueba el `slug` antes de reintentar para no crear duplicados.

### Formatos publicitarios discretos para Telegram - 2026-07-28
- El creador puede elegir formato automático, mosaico, fila compacta, tarjetas, recomendación rotatoria o cinta de accesos para las campañas comunitarias.
- Todos los formatos evitan ventanas emergentes y conservan la medición individual por chat.

### Campañas publicitarias para comunidades Telegram - 2026-07-28
- El creador permite seleccionar una comunidad completa detectada por Moonbot y preparar una única campaña con sus grupos y canales públicos.
- NoticiasWeb3 divide el hueco publicitario en un mosaico adaptable, enlazando cada fragmento con el chat correspondiente.
- Los clics conservan país y ubicación, y además se contabilizan individualmente por chat de la comunidad.

### Comunidades reales de Telegram - 2026-07-28
- El panel de cada grupo muestra si pertenece a una comunidad de Telegram, sus chats ya vinculados y los chats administrados que todavía se pueden añadir.
- Se incorporan detección Bot API 10.2, comprobación conjunta y accesos para completar la vinculación en Telegram.
- El listado identifica visualmente los grupos y canales que ya pertenecen a una comunidad.

### Vista "roadmap por producto" y panel de progreso en Moonbot - 2026-07-28
- Se agregó `/api/moonbot-admin/roadmap-summary` para mostrar, desde la API protegida por admin/creator, el inventario verificable del roadmap 3000 por estado y producto.
- El centro Moonbot de la web ahora incluye una tarjeta de progreso con:
  - totales globales,
  - porcentaje de implementación por producto (`web`, `moonbot`, `webapp`),
  - vista de las funciones implementadas y propuestas de cada producto,
  - atajos directos al Roadmap con filtros rápidos.
- Se mantiene compatibilidad total con la estructura anterior del roadmap y la navegación existente.
- Se añadió un bloque de **acciones rápidas** en el panel Moonbot Admin para registrar operaciones internas de administración.
- Nuevo endpoint privado `POST /api/moonbot-admin/quick-actions` para trazar y mostrar acciones operativas (limite temporal, sin persistir en analytics sensibles).

### Anuncios propios como fallback robusto en NoticiasWeb3 - 2026-07-28
- Se corrige `AdSense` para que los anuncios propios se muestren aunque el hueco no tenga slot real de AdSense.
- La lógica de fallback ya no depende de `data-ad-status='unfilled'` para buscar `/hcgi/api/house-ads`.
- Si no hay slot configurado o AdSense no devuelve anuncio, se consulta siempre el endpoint interno y se muestra una vista alternativa visible.
- Se evita render vacío total por fallos de script/estado de anuncio y se muestra mensaje de estado cuando no hay campaña propia disponible.

### Filtro de imágenes reforzado para terrorismo y abuso sexual infantil - 2026-07-28
- El centro de seguridad de Moonbot ahora permite configurar una política activa de imágenes por nivel de riesgo y acción (revisión, aviso, mute o ban).
- Se habilitaron categorías de riesgo ampliadas: terrorismo/propaganda violenta, pornografía sexual con menores, violencia extrema, armas, autolesión, drogas, discursos de odio, contenido sexual adulto, desnudez, malware/fraude técnico, deepfakes/manipulación y contenido ilegal no especificado.
- El filtro admite umbral de confianza, proveedor (VirusTotal, safe-search, local o combinado), y opción de borrado automático opcional.
- La configuración se persiste en `image_policy` desde la web protegida y se envía vía `POST /moonbot-admin/security` con acción `set_image_policy`.
- Se dejó trazabilidad en resultados/incidencias para validar cada ajuste y poder revertir rápidamente la acción.
- Se añadió compatibilidad inicial de vídeos de Telegram en la misma política de seguridad:
  - activación de escaneo de vídeos en `video_policy`/`media_policy` manteniendo `image_policy` para compatibilidad;
  - selector de alcance (solo imágenes o imágenes + vídeos) en el panel;
  - envío seguro de `media_kinds` para que el bot interno pueda aplicar filtros por tipo de contenido.

### Excepciones de captcha por grupo y usuario - 2026-07-28
- En el panel de grupo (TodoSobreAllTech Web) se añadió gestión de excepción de captcha por **usuarios** y **grupos**.
- Se persiste la configuración en `join_config` (`exempt_user_ids` y `exempt_group_ids`) para que la regla se aplique por grupo desde la misma ficha de administración.
- La captura de IDs ahora valida formato y evita valores no numéricos antes de enviarlos al endpoint de Moonbot.

### Reacciones contextuales de Telegram - 2026-07-28
- El panel de cada grupo permite activar perfiles selectivo, equilibrado o activo y ajustar frecuencia y espera.
- La configuración se comparte con Moonbot y la WebApp; el análisis evita comandos y mensajes sensibles.

### API 1.0.0 y actualización de seguridad - 2026-07-28
- La API pasa de Node.js 20, ya fuera de soporte, a Node.js 24 LTS.
- Axios, Express, GeoIP Lite y Morgan se actualizan a versiones corregidas y fijadas para evitar cambios inesperados.
- El contenedor utiliza `npm ci` y el lockfile específico de la API para construcciones reproducibles.
- La auditoría final de dependencias de producción informa de cero vulnerabilidades.

### Roadmap técnico verificable - 2026-07-28
- El roadmap separa funciones implementadas, estructuras parciales, especificaciones y propuestas sin comenzar.
- Añade el contador real pendiente y el porcentaje verificado, evitando presentar una definición como código operativo.
- La automatización RSS de grupos queda registrada como implementación comprobada en Moonbot y Telegram WebApp.

### RSS automático por grupo - 2026-07-28
- Cada grupo dispone de una lista propia de fuentes RSS o Atom en su panel independiente.
- El master puede añadir, probar, activar, pausar y eliminar fuentes desde la web; las operaciones se envían a Moonbot mediante la API interna protegida.
- La interfaz muestra el último chequeo y los errores de cada fuente sin mezclar este sistema con el RSS editorial de NoticiasWeb3.
- Cada fuente admite palabras obligatorias y excluidas, plantilla de publicación y un tema concreto de Telegram como destino.
- La administración web añade frecuencia, límite por ciclo, horario silencioso, tolerancia a fallos y ejecución inmediata por fuente.
- Cada fuente se puede renombrar y reiniciar de forma segura para reconstruir su cursor sin publicar el historial anterior.
- El panel muestra comprobaciones, publicaciones, descartes, errores y el historial reciente de entregas.
- La web muestra estado, latencia y próxima comprobación por fuente, con acceso al artículo entregado.
- Se pueden reiniciar métricas o vaciar el historial sin eliminar la configuración RSS.
- Los reintentos aplican espera progresiva tras errores para reducir carga sobre fuentes inestables.

### Correlación de incidencias multigrupo - 2026-07-28
- El centro de seguridad puede agrupar incidentes relacionados de varios grupos por tiempo, tipo y términos compartidos.
- El resultado muestra riesgo, grupos afectados, número de eventos, periodo y señales comunes.
- La API mantiene la clave administrativa fuera del navegador y limita la operación a cuentas autorizadas.

### Bóveda personal cifrada - 2026-07-28
- Nueva bóveda de notas privadas dentro de Ajustes, almacenada únicamente en el dispositivo.
- Cifrado AES-GCM de 256 bits con clave derivada mediante PBKDF2-SHA-256 y 250.000 iteraciones.
- Incluye creación, desbloqueo, bloqueo, actualización y eliminación definitiva, sin enviar contraseña ni contenido al servidor.

### Navegación por voz auditada - 2026-07-28
- Auditoría del historial remoto y del código de Web, Moonbot y WebApp antes de implementar para evitar duplicados.
- La cabecera permite abrir inicio, blog, proxies, roadmap, panel, administración, creador, ajustes y perfil mediante voz.
- El control aparece solo en navegadores compatibles y ofrece estado visual mientras escucha.
- El roadmap marca como integradas únicamente las tres capacidades de voz comprobadas en sus módulos reales.

### Comparador del roadmap sin duplicar funciones - 2026-07-27
- Auditoría cruzada de Web, API, Moonbot y WebApp para descartar capacidades ya existentes antes de desarrollar.
- Nuevo comparador de hasta tres entradas con estado, prioridad, dificultad y dependencia visibles en paralelo.
- La selección se mantiene al buscar, filtrar y cambiar de página durante la sesión.

### Herramientas operativas del roadmap - 2026-07-27
- `/roadmap` permite guardar favoritas en el dispositivo y mostrar únicamente la selección personal.
- Los filtros se conservan en la URL para compartir exactamente la misma vista con otra persona.
- Se añaden ordenación por prioridad, novedad o título, exportación CSV de resultados y restablecimiento rápido.
- Corregida la codificación de los textos visibles de la página.

### Conservación de oleadas del roadmap - 2026-07-27
- Las 1.000 definiciones de la oleada anterior se conservan con el estado «Completada (definición)».
- Las 1.000 propuestas regeneradas se añaden sin sustituir el historial, elevando `/roadmap` a 3.000 entradas únicas.
- Se diferencia explícitamente una definición completada de una función integrada y operativa.

### Segunda oleada de 1.000 propuestas en `/roadmap` - 2026-07-27
- El roadmap público crece a 2.000 funciones únicas y consultables desde una sola página.
- Se incorporan 1.000 propuestas nuevas, equilibradas entre TodoSobreAllTech Web, Moonbot y Telegram WebApp.
- La cabecera diferencia con contadores las funciones integradas, en desarrollo y propuestas, sin presentar ideas pendientes como implementadas.

### Roadmap e inventario de features incluidas - 2026-07-27
- `/roadmap` incorpora un apartado independiente con todas las features verificadas como incluidas.
- Se mantienen filtros por producto, categoría y estado para consultar las funciones en desarrollo.

### Roadmap como única vista de planificación - 2026-07-27
- `https://todosobreall.tech/roadmap` pasa a ser la única pantalla del inventario de funciones.
- Eliminado el centro Horizonte del panel master; las funciones terminadas viven en sus módulos correspondientes.
- La página distingue entre funciones integradas, en desarrollo y propuestas sin ofrecer un ejecutor genérico.

### Horizonte mediante recursos REST reales - 2026-07-27
- Cada función dispone de un recurso autenticado propio en `/moonbot-admin/horizon/:slug`.
- La web deja de enviar todas las operaciones al ejecutor monolítico y utiliza la ruta correspondiente a la función seleccionada.
- El catálogo vuelve a distinguir honestamente entre funciones integradas y funciones con ruta preparada.

### Horizonte completo y ejecutable - 2026-07-27
- Las 1.100 funciones del Horizonte unificado pueden abrirse y ejecutarse desde el Centro Moonbot.
- Las 1.000 funciones multiplataforma incorporan configuración, persistencia, auditoría, estado y reversión.
- El catálogo público marca las 1.000 entradas como implementadas después de validar sus motores.
- Cada entrada incluye ahora contexto, capacidad concreta y un formulario JSON inicial adaptado a su operación.

### Horizonte unificado - 2026-07-27
- Horizonte 202 y Horizonte 1000 aparecen ahora como un único Horizonte de 1.100 entradas.
- El panel distingue las 100 funciones ejecutables, las iniciativas implementadas y las propuestas pendientes.
- Se conservan las rutas anteriores para mantener la compatibilidad.

### Centro completo Horizonte 202 - 2026-07-27
- Nuevo panel master con las 100 funciones operativas, búsqueda, filtros por área y estado del motor responsable.
- Cada función dispone de formulario JSON asistido, ejecución protegida, resultado legible e historial auditable.
- La API de TodoSobreAllTech actúa como proxy servidor-a-servidor y nunca entrega la clave administrativa de Moonbot al navegador.
- El catálogo combina las 25 funciones originales y las 75 capacidades finales sin duplicarlas.

### Herramientas ampliadas del chat web - 2026-07-27
- El chat master incorpora edición, copia, reenvío y limpieza completa de reacciones por ID de mensaje.
- Se puede desfijar toda la conversación y crear encuestas sin abandonar TodoSobreAllTech.
- Los destinos de copia y reenvío se validan contra los grupos y canales realmente administrados.

### Operaciones de mensajes desde el chat web - 2026-07-27
- El master puede responder, reaccionar, fijar, desfijar o borrar indicando el mensaje de Telegram.
- Se incorporan envío silencioso y protección contra reenvío tanto en mensajes normales como enriquecidos.
- El backend valida que el mensaje pertenezca al grupo abierto y reutiliza los controles existentes de Moonbot.

### Chat efímero y Comunidades Telegram 10.2 - 2026-07-27
- El chat master puede dirigir un mensaje privado efímero a un usuario concreto dentro de un grupo.
- La interfaz valida el ID receptor y evita combinar el modo efímero con formatos no admitidos por Telegram.
- Los chats asociados a una Comunidad Telegram muestran su estado 10.2 en la cabecera.

### Bot API 10.2 en el chat web - 2026-07-27
- El chat master permite alternar entre mensaje normal, Rich Markdown y Rich HTML.
- Se añaden plantillas visuales de detalles, listas, citas y fórmulas, soporte RTL y multimedia referenciada.
- La interfaz admite foto, vídeo, audio, animación y notas de voz de Bot API 10.2 con fallback compatible.

### Avisos de aprendizaje IA de Moonbot - 2026-07-27
- El Centro de control muestra las copias horarias del aprendizaje de Moonbot con estado, tamaño, neuronas, progreso y fecha.
- Los avisos aparecen también en el centro de experiencia y distinguen visualmente una entrega correcta de un fallo.

### Chat Telegram para el master - 2026-07-27
- El centro Moonbot incorpora una pestaña de chat con búsqueda paginada de grupos y canales.
- Permite leer el historial registrado, identificar el bot asociado, refrescar automáticamente y enviar mensajes Markdown desde la web.
- La sesión creator/admin y la clave interna siguen siendo obligatorias; ningún token de Telegram llega al navegador.
- Se muestran todas las instancias propias, se puede filtrar por bot y elegir cuál publica cuando varios comparten el mismo grupo.
- Cada mensaje de usuario ofrece controles rápidos de mute, ban, advertencia, karma, cuarentena y restauración, equivalentes al chat original de Moonbot.
- Los archivos multimedia del historial se cargan solo al solicitarlos, con sesión master, comprobación de pertenencia y límite de 20 MB.

### Actualización manual desde Telegram - 2026-07-27
- Cada comunidad muestra cuándo se sincronizó por última vez.
- El panel independiente permite actualizar nombre, alias, descripción, miembros, administradores y permisos sin abandonar la web.
- La interfaz bloquea la acción mientras está en curso y vuelve a consultar el estado real al terminar.
- La cabecera carga la foto real del grupo o canal mediante una ruta autenticada y muestra un avatar alternativo si Telegram no ofrece imagen.
- Cada panel muestra propietarios y administradores con nombre, alias, ID, rol y momento de la última comprobación.

### Grupos y canales con búsqueda global - 2026-07-27
- Las listas consultan Moonbot por páginas de 40 elementos en lugar de filtrar únicamente datos ya cargados.
- La búsqueda cubre nombre, ID, enlace público y bot asociado.
- Los canales y grupos se clasifican en el servidor según su tipo real de Telegram.

### Búsqueda paginada y pestañas persistentes - 2026-07-27
- Usuarios y sanciones busca sobre el inventario completo de Moonbot y pagina los resultados desde el servidor.
- El dashboard conserva la última herramienta abierta y refleja su estado en el parámetro `moon` de la URL.
- Las pestañas pueden recargarse o compartirse sin volver al índice general.

### Dashboard compacto por pestañas - 2026-07-26
- Las herramientas master de Moonbot dejan de renderizarse en una página continua y se abren individualmente.
- Se añade navegación de vuelta al índice y carga diferida únicamente de la pestaña seleccionada.
- Grupos, canales, usuarios, anuncios, seguridad, IA y operaciones mantienen paneles independientes.

### Entrega de anuncios propios en NoticiasWeb3 - 2026-07-26
- NoticiasWeb3 reenvía el catálogo `/hcgi/api/house-ads` y los clics medidos a la API interna.
- Se evita que la SPA devuelva HTML cuando el componente de anuncios espera JSON.

### Anuncios con comunidades e imágenes detectadas - 2026-07-26
- El creador de anuncios muestra los grupos y canales administrados para elegir el destino.
- Permite seleccionar y almacenar fotos JPG, PNG, WebP o GIF desde el dispositivo.
- Valida el contenido y limita las imágenes a 4 MB antes de publicarlas.

### Administración separada de Telegram - 2026-07-26
- Usuarios, grupos y canales tienen accesos de administración independientes.
- Los canales se clasifican por su tipo real de Telegram y dejan de mezclarse con los grupos.
- Cada grupo y canal conserva su buscador y su panel de gestión independiente.

### Publicidad con Markdown - 2026-07-26
- Los anuncios propios admiten negrita, cursiva, código, enlaces HTTPS y saltos de línea con renderizado seguro y vista previa.

### Objetivos y análisis de campañas - 2026-07-26
- Las campañas admiten objetivo máximo de clics con pausa automática, duplicación limpia y desglose de clics por ubicación.

### NoticiasWeb3 embebida en la MiniApp - 2026-07-26
- Traefik permite expresamente mostrar la web pública dentro del Hub sin que `X-Frame-Options` bloquee el contenido.

### Anuncios propios configurables - 2026-07-26
- Nuevo flujo de aprobación: los administradores proponen campañas y el creador las aprueba o rechaza; las métricas se actualizan cada 30 segundos.
- Las campañas se pueden editar y programar con fecha de inicio y fin; el panel distingue estados y permite reiniciar métricas.
- El recomendador automático detecta el formato con menor cobertura, reutiliza el destino con mejor CTR y prepara texto, colores, botón y prioridad.
- Nuevo creador visual con formatos superior, lateral e inline, vista previa, imagen, llamada a la acción y colores personalizados.
- TodoSobreAllTech incorpora un gestor de anuncios de canales y grupos propios con ubicación, prioridad, imagen, estado y clics.
- La API expone el catálogo público y registra redirecciones sin depender de AdSense.
- Noticias Web3 usa estos anuncios únicamente cuando Google no llena el espacio correspondiente.
- Todos los destinos pasan por enlaces medidos del dominio propio y el panel calcula impresiones, clics y CTR por ubicación.

### Publicidad sin espacios vacíos - 2026-07-26
- Los bloques sin una ranura real ya no muestran maquetas publicitarias al público.
- Noticias Web3 observa el estado `filled/unfilled` de AdSense y elimina los anuncios no servidos.
- Los contenedores superior, lateral e intercalado colapsan al quedar vacíos.
- Durante la carga el anuncio permanece invisible y desaparece si Google no responde en cinco segundos.
- El formato lateral de 160×600 se desactiva en móvil para que nunca invada el contenido.

### Noticias Web3 2026 dentro de Moonbot - 2026-07-26
- Noticias Web3 acepta el parámetro seguro `version=2026` al iniciar y aplica directamente su interfaz moderna.
- La selección explícita tiene prioridad sobre preferencias antiguas guardadas en el navegador.

### Conexión directa a proxies MTProto - 2026-07-26
- El catálogo web permite abrir cada proxy directamente en Telegram además de copiar sus credenciales.
- Los enlaces se reconstruyen de forma segura cuando el origen no entrega uno explícito.

### Servicio gratuito y sin ánimo de lucro - 2026-07-26
- La portada, el dashboard y el pie de página informan claramente del carácter comunitario, gratuito y sin ánimo de lucro del proyecto.
- El aviso aclara que el acceso a las funciones ofrecidas no tiene coste.

### Anuncios recíprocos entre grupos - 2026-07-26
- El panel web incorpora perfiles publicitarios selectivo, equilibrado y amplio, además de desactivación por grupo.
- La política limita campañas diarias, descanso entre socios y diferencia máxima de audiencia.
- Los perfiles incluyen límites semanales y pausa automática según fallos recientes de entrega.
- El nuevo centro de campañas permite al master crear, aceptar, cancelar y consultar intercambios desde la web protegida.
- La API conecta este centro con Moonbot mediante la integración interna servidor a servidor.

### Salud y rendimiento de plugins - 2026-07-26
- El panel muestra ejecuciones, errores, latencia media y último fallo de cada plugin.
- Los plugins aislados automáticamente aparecen destacados tanto en la web como en la MiniApp.

### Aislamiento de plugins por grupo - 2026-07-26
- Cada panel de grupo permite activar o desactivar individualmente los plugins instalados.
- El contador distingue plugins disponibles y activos, y actualiza inmediatamente el menú de comandos de Telegram.

### Comandos dinámicos y plugins - 2026-07-26
- La web muestra el número de comandos públicos, administrativos y plugins cargados para cada grupo.
- El administrador puede ordenar una sincronización real del menú de Telegram desde el panel del grupo.

### Política de formatos por grupo - 2026-07-26
- El panel web añade perfiles para grupos sin restricciones, productivos, limitados a texto y documentos o solo texto estricto.
- Muestra formatos bloqueados, tamaño máximo y sanción aplicada usando la misma configuración de Moonbot.

### Anti-flood configurable por grupo - 2026-07-26
- El panel web incorpora perfiles desactivado, suave, equilibrado y estricto sincronizados con Moonbot.
- Cada grupo muestra el límite de mensajes, ventana temporal, duración del mute y reincidencias necesarias para ban local.

### Mute real durante el captcha - 2026-07-26
- El panel de cada grupo permite activar o desactivar el bloqueo de permisos de Telegram hasta completar la verificación.
- La web muestra el estado procedente de Moonbot y guarda el ajuste mediante la integración administrativa protegida.

### Horizonte 1000 sincronizado · bloque de moderación - 2026-07-26
- La web incorpora simulación segura de reglas, plantillas reutilizables, informes programados, traducción coordinada y comunicados versionados.
- Todas las acciones pasan por la API protegida de TodoSobreAllTech y se ejecutan en Moonbot mediante autenticación servidor-a-servidor.
- El centro master enlaza directamente con estas herramientas sin duplicar su lógica.

### Centro master alineado con la MiniApp - 2026-07-26
- El dashboard incorpora una navegación compacta hacia grupos, usuarios, seguridad, editorial, IA, automatizaciones, integraciones y operaciones.
- Las acciones reutilizan los centros administrativos existentes y conservan la carga diferida para no ralentizar la pantalla inicial.
- Los módulos reciben el mismo inventario multibot con grupos únicos, compartidos y la instancia responsable.

### Inicio de sesión de Telegram corregido - 2026-07-26
- Web y API usan el mismo Client ID servido desde la configuración del backend.
- El nonce se genera y consume en el servidor con caducidad para impedir reutilizaciones.
- Se validan firma, emisor, audiencia, expiración y nonce antes de crear la sesión.
- La política COOP permite comunicarse con la ventana emergente de Telegram Login.
- La pantalla explica si falta configuración o si el script fue bloqueado.
- La ventana emergente usa `Telegram.Login.auth` con sus opciones oficiales; la API pública permanece bajo `/hcgi/api` y no se confunde con las rutas SPA.
- El nonce se prepara antes del clic para que el navegador no bloquee la ventana de Telegram como un popup ajeno al usuario.
- El popup usa exactamente el `Trusted Origin` admitido por BotFather aunque la pantalla de acceso esté en `/login`.
- La verificación admite conexiones lentas al descargar las claves públicas de Telegram y diferencia un fallo temporal de red de un token inválido.
- Las claves públicas oficiales tienen un respaldo local para que el acceso siga funcionando cuando el servidor no alcance temporalmente el JWKS de Telegram.
- Una migración de reparación garantiza que PocketBase disponga de los campos de identidad de Telegram aunque una instalación antigua los hubiera perdido.
- El dashboard carga estadísticas agregadas aunque falle temporalmente la consulta personal de perfil o bots, evitando tarjetas engañosas a cero.
- La validación del dashboard usa HTTP directo contra PocketBase en lugar del transporte inestable de `authRefresh` del SDK tras reinicios.
- El mapa lingüístico admite respuestas lentas de Moonbot sin abortar prematuramente.
- PocketBase dispone de un alias Docker exclusivo para evitar colisiones DNS con otros proyectos que también usan un servicio llamado `pocketbase` en la red compartida de Traefik.
- `auth-refresh` utiliza una conexión HTTP interna dedicada, aislada del pool global saturado por integraciones externas.
- El dashboard lanza `/stats` inmediatamente y en paralelo, sin esperar a consultas personales que puedan quedar pendientes.
- La consulta de estadísticas ya no depende del rol almacenado en el navegador; la autorización se decide exclusivamente en la API.

### Rendimiento por instancia Moonbot - 2026-07-26
- La tarjeta muestra por bot estado, grupos, eventos procesados, latencia, errores, uptime y salud del polling.
- Los datos proceden de cada proceso real de Moonbot y permanecen separados por instancia.
- El nombre oficial y el `@username` se muestran desde el perfil devuelto por la API de Telegram.
- Los contadores distinguen grupos exclusivos y compartidos para explicar solapamientos entre bots.

### Dashboard de carga rápida - 2026-07-26
- Las páginas y herramientas administrativas se dividen en módulos descargables bajo demanda.
- Perfil y bots personales cargan en paralelo; las estadísticas agregadas ya no bloquean la primera pantalla.
- Los centros avanzados de Moonbot se activan progresivamente al acercarse durante el desplazamiento.
- El JavaScript inicial comprimido se reduce de aproximadamente 407 KB a 176 KB.

### Propiedad de grupos por bot - 2026-07-26
- Cada grupo muestra la instancia de Moonbot responsable sin exponer su token.
- La búsqueda de grupos admite también el nombre del bot.

### Horizonte 1000 · Cuentas, bloque 1 - 2026-07-26
- Implementadas `future-0001` a `future-0003`: previsión de altas, asistente guiado y alertas adaptativas.
- El catálogo distingue ahora propuestas de funciones realmente implementadas.
- Implementadas `future-0004`–`future-0007`, `future-0009` y `future-0010`: reglas configurables, comparación temporal, exportación HMAC, simulación, búsqueda por significado y resumen explicable.
- `future-0008` incorpora ahora historial versionado persistente real.
- Completadas `future-0008`, `future-0011` y `future-0015`: historial persistente en volumen, permisos por rol y exportación sin datos personales.

### Corrección de autenticación administrativa - 2026-07-26
- Las peticiones simultáneas de los widgets comparten una única renovación de sesión para evitar saturar PocketBase.
- La renovación admite conexiones internas lentas sin declarar PocketBase inaccesible demasiado pronto.

## [0.19.0] - 2026-07-26
### Experiencia web y MiniApp equilibrada
- Buscador global de acciones con navegación interna e historial.
- Favoritos persistentes y centro unificado de notificaciones.
- Modo compacto, tamaño de texto, alto contraste y movimiento reducido.
- Temas visuales por grupo y configuración de widgets personales.
- Trabajo sin conexión con sincronización automática posterior.
- Recorrido guiado reiniciable para las funciones administrativas.

## [0.18.0] - 2026-07-26
### Operaciones y fiabilidad Moonbot
- Panel de métricas de CPU, memoria, disco y latencia con alertas.
- Planificación de despliegues graduales y seguimiento por instancia.
- Políticas de copia cifrada y planes de restauración cancelables.
- Supervisión de dependencias y capacidades disponibles en modo degradado.
- Diagnóstico automático y agrupación de errores recurrentes.
- Programación de ventanas de mantenimiento con mensajes informativos.

## [0.17.0] - 2026-07-26
### Integraciones y API Moonbot
- Gestión visual de módulos, permisos, versiones y checksums.
- Creación de tokens por ámbitos con visualización única, rotación y revocación.
- Controles de sandbox y cuotas por bot y método.
- Enlaces administrables para incidentes y calendarios externos.
- Consulta del manifiesto y eventos disponibles en el SDK de extensiones.
- Preparación de paquetes de configuración firmados contra modificaciones.

## [0.16.0] - 2026-07-26
### Centro de automatizaciones Moonbot
- Constructor visual de reglas, condiciones y respuestas automáticas por grupo.
- Simulador seguro para comprobar coincidencias antes de activar un flujo.
- Creación de formularios adaptables, webhooks HTTPS y acciones programadas.
- Vista operativa de colas con priorización, cancelación y reintentos.
- Biblioteca de automatizaciones instalables con un clic.
- Secretos y contenido sensible de los webhooks nunca llegan al navegador.

## [0.15.0] - 2026-07-26
### Centro de IA Moonbot
- ConfiguraciÃ³n de proveedor y modelo global o por grupo.
- AdministraciÃ³n de fuentes de aprendizaje aprobadas.
- Visibilidad del tamaÃ±o de memoria por comunidad.
- Comparador de calidad y coste entre modelos.
- Cola de respuestas que requieren revisiÃ³n humana.
- La interfaz nunca recibe claves API de Gemini, Ollama ni otros proveedores.
- Herramientas visibles para detectar preguntas sin respuesta, registrar latencia/coste y borrar memorias concretas.

## [0.14.0] - 2026-07-26
### Seguridad administrativa en vivo
- Vista combinada de CAS, SpamWatch, registro comunitario, baneos locales y otras fuentes.
- Raids activos actualizados automÃ¡ticamente cada 15 segundos.
- Detector visual de posibles suplantaciones de administradores.
- Panel para silenciar o restaurar usuarios por grupo.
- CreaciÃ³n de revisiones por pares para sanciones dudosas.

## [0.13.0] - 2026-07-26
### Horizonte 1000
- CatÃ¡logo reproducible con 1.000 propuestas Ãºnicas: 334 para TodoSobreAllTech, 333 para Moonbot y 333 para Telegram WebApp.
- BÃºsqueda global y filtros por producto, categorÃ­a, prioridad y dificultad.
- Fichas con descripciÃ³n, dependencia y estado claramente marcado como propuesta.
- PaginaciÃ³n para mantener un rendimiento estable al navegar por el catÃ¡logo completo.
- Script de generaciÃ³n determinista ejecutado durante la compilaciÃ³n de la web.

## [0.12.0] - 2026-07-26
### AdministraciÃ³n de grupos completada
- GuÃ­a visible para corregir permisos faltantes de Moonbot.
- Historial reciente sanitizado dentro de la ficha del grupo.
- Comparador de reglas y configuraciones entre comunidades.
- Copia de configuraciÃ³n conservada como acciÃ³n separada y explÃ­cita.
- Backend preparado para mute, revisiÃ³n por pares y detecciÃ³n de suplantaciÃ³n.

## [0.11.0] - 2026-07-26
### Centro editorial Moonbot
- Editor de publicaciones Telegram compatible con Markdown.
- SelecciÃ³n de uno o varios grupos administrados como destinos.
- PublicaciÃ³n inmediata, programada y recurrente.
- Vista previa del mensaje antes de enviarlo.
- Biblioteca de plantillas reutilizables.
- Calendario de publicaciones pendientes y recurrencias.
- Comparador de titulares con puntuaciÃ³n de claridad y seÃ±ales de clickbait.
- Comunicados versionados para conservar correcciones e historial.

## [0.10.0] - 2026-07-26
### Centro de seguridad Moonbot
- Panel agregado de amenazas, raids, anÃ¡lisis multimedia y fuentes de baneos.
- Consulta de URL, dominio o hash utilizando VirusTotal desde el servidor.
- Detector privado de secretos que no conserva el contenido introducido.
- CronologÃ­a de incidentes recientes con niveles de riesgo.
- Descarga de paquetes JSON de evidencia firmados por Moonbot.
- Acceso exclusivo para administradores y creadores mediante el proxy autenticado.

## [0.9.0] - 2026-07-26
### Usuarios, CAS y sanciones Moonbot
- Buscador de usuarios observados por nombre o ID de Telegram.
- Ficha individual con actividad, reputaciÃ³n, participaciÃ³n, notas y estado CAS local.
- VisualizaciÃ³n del motivo y la fuente de cada baneo global.
- Acciones de ban, restauraciÃ³n y cuarentena globales o por grupo.
- Consulta y resoluciÃ³n de apelaciones desde la web principal.
- Todas las operaciones viajan por el proxy autenticado y quedan auditadas en Moonbot.

## [0.8.0] - 2026-07-26
### AdministraciÃ³n de grupos Moonbot
- Lista y buscador de grupos administrables desde todosobreall.tech.
- Cada grupo se abre como un panel independiente con navegaciÃ³n de regreso.
- DiagnÃ³stico visible de permisos faltantes y resumen de actividad real.
- VisualizaciÃ³n de mÃ³dulos activos y copia segura de configuraciÃ³n entre grupos.
- Proxy autenticado para que las claves internas nunca se entreguen al navegador.

## [0.7.0] - 2026-07-26
### Centro de control Moonbot
- IntegraciÃ³n servidor-a-servidor protegida para administrar Moonbot desde la web principal sin exponer credenciales.
- Panel unificado con instancias conectadas, usuarios activos en 24 horas, grupos administrados y acciones pendientes.
- MÃ©tricas reales de CPU, RAM y almacenamiento, estado de servicios y rendimiento por bot.
- CronologÃ­a de actividad administrativa y actualizaciÃ³n manual con respuesta degradada segura.
- ReutilizaciÃ³n de las funciones operativas existentes en Moonbot en lugar de contadores simulados.

## [0.6.0] - 2026-07-26
### Mapa lingüístico global de Telegram
- Nuevo mapa visual para administradores y creadores basado en el idioma declarado por los usuarios de Telegram.
- Métricas agregadas de usuarios, idiomas y porcentajes sin exponer identidades ni ubicaciones reales.
- Proxy API con caché y timeout hacia el endpoint público agregado de Moonbot.
- Leyenda y aviso de precisión para evitar presentar el idioma como geolocalización física.

## [0.5.0] - 2026-07-26
### Horizonte 202 completado
- Las 100 funciones aparecen como operativas y sincronizadas con Moonbot v18.0.0.
- El motor final cubre contenido, IA, accesibilidad, privacidad, operaciones, integraciones, sostenibilidad y Telegram.
- La página `/roadmap` muestra el estado final sin confundir funciones operativas con propuestas pendientes.

## [0.4.0] - 2026-07-26
### Horizonte 202
- Nueva página pública `/roadmap` con buscador y filtros por categoría.
- Catálogo sincronizado con Moonbot: 100 ideas adicionales repartidas en diez áreas.
- Las propuestas aparecen claramente marcadas como planificadas y no se confunden con funciones operativas.
- La página sincroniza el estado de las primeras cinco funciones ya disponibles en Moonbot.
- Estado ampliado a las diez funciones de confianza y moderación ya operativas.
- Seguimiento ampliado a 15 funciones operativas con el primer bloque de participación comunitaria.
- Seguimiento ampliado a 20 funciones: misiones compartidas, aportes invisibles, salud social agregada, relevos administrativos y memoria anual.
- Seguimiento ampliado a 25 funciones con series editoriales, reutilización, silencios, comparación de titulares y comunicados versionados.

## [0.3.0] - 2026-07-25
### Panel creador y administración conectada
- Acceso directo desde el dashboard de creadores al centro de grupos de Moonbot, manteniendo la autorización sensible en la Mini App de Telegram.
- Paneles de creador ampliados para administrar artículos de NoticiasWeb3, cuentas y proxies, con estadísticas agregadas servidas desde la API.
- Temas visuales estacionales y festividades locales europeas sin alterar la navegación ni la accesibilidad del sitio.
- Integración de anuncios de NoticiasWeb3 revisada: slots superior, lateral e inline configurables mediante variables de entorno.

### Suite avanzada para grupos
- La web principal enlaza la administración equilibrada con la web y la Mini App de Moonbot: cuarentena, anti-raid, reglas horarias, reportes, consenso, contexto de usuarios, roles, bienvenidas, resúmenes y plantillas.

## [0.2.0] - 2026-07-11
### Feature — Directorio de proxies MTProto
- **Multi-fuente**: catálogo desde 7 canales públicos de Telegram (`@ProxyMTProto`, `@DirectProxy`, `@ProxyMTProtoNew`, `@proxymt`, `@config_proxy`, `@GhostProxy`, `@mtproto_proxy`) + listas agregadas de GitHub (SoliSpirit, Grim1313), deduplicado y **verificado por TCP** (solo se listan los que responden). Crawl con paginación case-insensitive.
- **Geolocalización** con `geoip-lite` (país + coordenadas) para ordenar por cercanía al usuario.
- **Usuarios activos reales y países por proxy propio**: leídos de `/proc/net/tcp` de los contenedores mtproxy; histórico por hora/día y desglose por país en vivo. Sustituye al `active_inbound_connections` del `/stats` (que marcaba ~1, la propia conexión de stats).
- **Publicación no bloqueante**: build por fases (propios al instante → primeros online → catálogo completo) y **payload + catálogo persistidos en disco** → tras un reinicio se sirve la última lista conocida al instante; el escaneo nunca bloquea la web.
- **Proxies de la comunidad**: nuevo `POST /mtproto-proxies/community` (autenticado por token) para publicar los proxies que el master aprueba desde CintiaBot; se guardan en `community-proxies.json` y entran al catálogo con prioridad (tras los propios).

### Fix — Fiabilidad y correcciones del directorio
- Proxies **propios** comprobados por su dirección interna (`mtproxy-N:443`, ~2 ms) en vez de la IP pública (hairpin NAT desde el contenedor daba falsos "offline"); reintento ante picos de carga; ubicación forzada a 🇫🇷 Francia (geoip fallaba con la IP de Hostinger).
- `activeUsers` = conexiones concurrentes reales (fin del "1" fijo).
- Corregido cuelgue del build por `dns.lookup` sin timeout con hosts muertos; concurrencia de health más suave.

## [0.1.30] - 2026-05-24
### API — Endpoint RSS público
- Nuevo endpoint `GET /noticias/rss` en el API Express que devuelve un feed RSS 2.0 válido.
- Incluye los 75 artículos estáticos de noticiasweb3 (2014 y 2026) y todos los artículos publicados desde PocketBase, ordenados por fecha descendente.
- Cada `<item>` contiene título, enlace canónico, GUID, categoría, extracto de 300 caracteres y fecha en formato RFC 822.
- Implementado con `fetch` directo a PocketBase (colección pública) para evitar dependencias del cliente autenticado.
- Datos estáticos extraídos en `apps/api/src/data/staticArticles.js` como módulo ES reutilizable.
- `SITE_URL` configurable por variable de entorno (por defecto `https://noticiasweb3.todosobreall.tech`).

## [0.1.29] - 2026-05-24
### Infraestructura — API expuesta públicamente vía Traefik
- Servicio `api` en `docker-compose.yml` añadido a la red `traefik` con labels de enrutamiento.
- El API ahora es accesible en `https://api.todosobreall.tech` con certificado SSL automático via Let's Encrypt.
- Permite que servicios externos (rss.app, webhooks, etc.) consuman el API sin pasar por la red interna Docker.

## [0.1.28] - 2026-05-24
### noticiasweb3 — Feeds RSS adicionales y widget Telegram en detalle
- Añadidos feeds: **Hispasec** (`v1.1/2IXDCnAS3PkRh3bD.json`), **NIST** (`v1.1/6dDuQLH543ORu2d9.json`), **Portaltic** (`v1.1/ivImG3xZTTMBDaY8.json`) como JSON Feed v1.1 (fetch directo sin proxy).
- Soporte completo para JSON Feed v1.1: función `normalizeJsonFeedItems` usando `item.url`, `item.title`, `item.date_published` y `item.content_html || item.content_text`.
- `fetchFeed` detecta automáticamente el formato por extensión `.json` vs XML.
- **Ticker de rss.app** embebido como `<iframe>` justo debajo del contador de artículos en `NoticiasPage`.
- **Widget de Telegram** (`TelegramEmbed`) movido de la lista a la página de detalle de cada noticia: se inyecta dinámicamente con `useEffect` + `appendChild` (no se puede usar `<script>` en JSX directamente).
- `getTelegramPost(article)` extrae `Canal/PostID` de cualquier URL `t.me/`.
- Corrección: keyword `' móvil '` con espacio en ambos lados para evitar falsos positivos en "datos móviles".
- Ampliadas keywords de Ciberseguridad con términos técnicos: CVE, CVSS, PoC, escalada de privilegios, bypass, exfiltración, ejecución remota, etc.

## [0.1.27] - 2026-05-24
### noticiasweb3 — Corrección de categorización RSS + keywords Ciberseguridad
- Corregido bug por el que artículos de NetBlocks (apagones de internet) se clasificaban como **Móviles** en lugar de **Ciberseguridad**: la keyword `'móvil'` sin espacios coincidía con "datos móviles" y "red móvil" en el texto de los posts, ganando antes que el fallback de categoría.
- `'móvil'` cambiado a `' móvil'` (con espacio delantero) para que solo coincida como palabra independiente.
- Añadidas keywords de apagones de internet a **Ciberseguridad**: `'apagón de internet'`, `'corte de internet'`, `'bloqueo de internet'`, `'internet bloqueado'`, `'netblocks'`, `'internet shutdown'`, `'conectividad a internet'`.

## [0.1.26] - 2026-05-24
### noticiasweb3 — Corrección de errores de inicio y deduplicación
- Corregido crash "Cannot access 'pbArticles' before initialization": el `useMemo` de `excludeUrls` y la llamada a `useTelegramFeed` estaban declarados antes que los `useState` que necesitaban. Reordenado: primero todos los estados, luego el useMemo y el hook.
- `EXISTING_TELEGRAM_URLS` renombrado a `STATIC_ARTICLE_URLS` y ampliado: ahora incluye `telegramUrl`, `externalUrl` y `source.url` de todos los artículos estáticos, no solo los `telegramUrl`.
- `excludeUrls` ahora es un `useMemo` dinámico que también incluye `fuente_url` y `telegram_url` de los artículos de PocketBase: si una noticia ya está publicada manualmente y llega por un feed RSS, se filtra automáticamente.
- Eliminado parámetro `&count=50` de las llamadas a rss2json (requería API key de pago y causaba error 422, dejando todos los feeds sin cargar).
- Deduplicación interna en el hook por URL externa: si dos feeds RSS traen el mismo artículo, solo aparece una vez.

## [0.1.25] - 2026-05-24
### noticiasweb3 — Panel de admin para feeds RSS
- Panel "📡 Gestión de feeds RSS" visible solo para usuarios autenticados, en la sección de noticias.
- Formulario para añadir feeds: URL del feed, etiqueta (nombre de la fuente) y categoría por defecto.
- Lista de feeds activos con botón "✕ Eliminar" por cada uno.
- Los feeds se persisten en PocketBase (`nw3_settings`, key `rss_feeds`) y se cargan automáticamente al abrir la página.
- Al añadir o eliminar un feed, `useTelegramFeed` re-fetcha automáticamente los artículos (el array `rssFeeds` se pasa como parámetro al hook).

## [0.1.24] - 2026-05-24
### noticiasweb3 — Compatibilidad con rss.app
- Soporte para feeds RSS genéricos (rss.app y cualquier otro proveedor RSS) en paralelo con los canales de Telegram.
- Array `RSS_APP_FEEDS` en `useTelegramFeed.jsx` donde se añaden feeds: `{ url, defaultCategory, label }`.
- Nueva función `normalizeRssItems`: usa `item.title` directamente (a diferencia de los posts de Telegram, que no tienen título propio y lo extraen de la primera línea del cuerpo). Títulos de hasta 120 caracteres.
- Función `normalizeRssItems` reutiliza el mismo proxy `rss2json.com`, la misma auto-categorización por keywords y el mismo `pubDateToDisplay`.
- IDs estables generados desde la URL del artículo (`rss-{slug-de-la-url}`).
- `Promise.allSettled` ahora combina fetches de Telegram y de rss.app en paralelo.

## [0.1.23] - 2026-05-24
### noticiasweb3 — Botones de compartir y tiempo de lectura
- **Componente `ShareBar`** (`src/components/ShareBar.jsx`) con cuatro opciones de compartir:
  - 📨 **Telegram** — abre `t.me/share/url` en nueva pestaña
  - ✖ **X (Twitter)** — abre `twitter.com/intent/tweet` en nueva pestaña
  - 💬 **WhatsApp** — abre `wa.me/?text=` en nueva pestaña
  - 🔗 **Copiar enlace** — copia al portapapeles con feedback visual ("¡Copiado!" en verde durante 2 s)
- En la **lista de noticias** (`NoticiasPage`): botones compactos (solo icono) bajo cada artículo, visibles en versión 2026.
- En la **página de detalle** (`NoticiaDetailPage`): barra completa (icono + etiqueta) que reemplaza el anterior botón único de Telegram.
- **Tiempo de lectura estimado** calculado con `extractText` + `readingTime` (200 ppm): visible en el meta de cada artículo tanto en la lista como en el detalle, con indicador ⏱. Se oculta en versión 2014.

## [0.1.22] - 2026-05-24
### noticiasweb3 — Easter eggs por categoría
- Al hacer clic en cualquier categoría del filtro de noticias aparece un toast animado con emoji y mensaje temático que desaparece automáticamente tras 2,8 segundos.
- Cada categoría tiene identidad visual propia (color de fondo, borde y texto diferente):
  - 🤖 **IA** — "Probabilidad de que esto sea sentience: 73,6%..." (morado)
  - ⚙️ **Tecnología** — "¡Sistema iniciado! Todos los subsistemas operativos." (azul)
  - 🔐 **Ciberseguridad** — `ACCESO CONCEDIDO. Bienvenido, agente.` (terminal verde sobre negro, monospace)
  - 🎮 **Gaming** — "¡NIVEL DESBLOQUEADO! +100 XP · Logro: Curioso/a" (rojo)
  - 🔬 **Ciencia** — "Hipótesis confirmada: eres increíblemente curioso/a." (cian)
  - 🚀 **Espacio** — "T−3... T−2... T−1... ¡Despegue exitoso!" (fondo oscuro índigo)
  - 📱 **Móviles** — "▂▄▆█ Señal al 100%. Conexión establecida." (azul claro)
  - ⚡ **Energía** — "Cargando ████████ 100% — ¡Batería completa!" (ámbar)
  - 📢 **Redes Sociales** — "¡Tu like ha sido procesado! +1 karma social 🌐" (rosa)
  - 📈 **Economía** — "Cotización de tu curiosidad: AL ALZA ↑ +∞%" (verde)
  - 💊 **Salud** — "Dosis diaria administrada. ¡Toma tu vitamina tech!" (rojo oscuro)
- Animación de entrada `eggFadeIn` (fade + deslizamiento desde arriba, 0,25s).

## [0.1.21] - 2026-05-24
### noticiasweb3 — Nuevas categorías + auto-categorización + recategorización
- Categorías añadidas: **Ciencia**, **Espacio**, **Móviles**, **Energía**, **Redes Sociales**, **Economía**, **Salud** (antes solo existían Tecnología, IA, Ciberseguridad y Gaming).
- Auto-categorización por palabras clave en `useTelegramFeed`: cada post del feed de Telegram es analizado por título y texto para asignarle la categoría más adecuada antes de mostrarlo. Si no coincide ninguna keyword, se usa la categoría por defecto del canal.
- Canal `@resistencia_censura` añadido al feed con categoría por defecto **Ciberseguridad**. Los posts de ambos canales (`@TodoSobreAllTech` y `@resistencia_censura`) se combinan en paralelo con `Promise.allSettled`.
- 13 artículos estáticos recategorizados:
  - → **Espacio**: China superfábrica cohetes, China robot base lunar, NASA Psyche-Marte
  - → **Móviles**: Apple Smart Glasses, Vision Pro crisis, Apple lab Madrid, Google Pixel 10
  - → **Economía**: Nvidia H200 China, Ormuz chips Samsung/TSMC, Irán cables submarinos, El Corte Inglés outlet
  - → **Energía**: Singapur célula solar invisible perovskita
  - → **IA**: Sony IA mejora fotos

## [0.1.19] - 2026-05-24
### noticiasweb3 — Noticias desde @TodoSobreAllTech + feed RSS automático
- Feed automático conectado a `rsshub.app/telegram/channel/TodoSobreAllTech` vía `rss2json.com` (CORS). Los posts del canal de Telegram aparecen automáticamente en la sección de noticias (versión 2026) sin intervención manual.
- Deduplicación automática: los posts que ya existen como artículos manuales se excluyen por `telegramUrl` para evitar duplicados.
- Los títulos de los artículos del feed enlazan directamente al post de Telegram (nueva pestaña), mientras que los artículos manuales enlazan a la página de detalle interna.
- Añadidas 4 noticias del 24 mayo 2026 añadidas manualmente desde @TodoSobreAllTech:
  - Célula solar invisible de perovskita (Universidad Nanyang, Singapur) — genera energía en sombra con 7,6% de eficiencia
  - Brecha de seguridad en vigilabebés Meari — 1 millón de dispositivos en 118 países expuestos (Wyze, Petcube, Arenti)
  - Aeropuerto Pokémon de Japón — Noto Satoyama reabre el 7 julio con 111 especies de Pokémon
  - Mercedes-Benz declara intención de entrar en la industria de defensa europea

## [0.1.18] - 2026-05-24
### noticiasweb3 — Nav 2026 iOS/Windows fijo abajo + submenús corregidos
- Nav fijo en la parte inferior de la pantalla (`position: fixed; bottom`) restaurado correctamente para iOS y Windows 11, ocupando el ancho completo (`left: 8px; right: 8px`).
- Items del nav aumentados a `font-size: 13px` y `line-height: 36px` para mejor legibilidad.
- Submenús cambiados de `top: 100%` a `bottom: 100%`: ahora se abren hacia arriba (correcto cuando el nav está abajo).
- Ancho del submenú ajustado al contenido (`width: max-content`) en vez de fijo o pantalla completa.
- Todos los 19 items del nav caben sin scroll horizontal en las 3 plataformas (Android: 3 filas, iOS: 2 filas, Windows 11: 2 filas) gracias a `flex-wrap: wrap`.

## [0.1.17] - 2026-05-23
### noticiasweb3 — Admin: pills de visibilidad, gestión de usuarios y mejoras de nav
- **Panel admin — visibilidad del nav**: reemplazados los checkboxes por botones pill coloreados (verde ● Visible / gris ✗ Oculto) para cada ítem de la navegación.
- **Panel admin — gestión de usuarios** (solo rol `admin`): tabla con todos los usuarios, selector de rol y botón de eliminar; formulario para crear nuevos usuarios con email, contraseña y rol inicial.
- **AuthContext**: expuesto el campo `role` del usuario autenticado para controlar funcionalidades exclusivas de admin en toda la app.
- **Nav admin — ítems personalizados**: crear nuevos ítems de nav con etiqueta y ruta, activar/desactivar visibilidad individualmente, y eliminar.
- **Admin — gestión de categorías de noticias**: ocultar/mostrar categorías al público sin eliminar los artículos.
- **Admin — moderación de artículos**: editar, eliminar y marcar artículos como destacados desde el panel.
- **Modo día/noche**: añadido botón toggle visible únicamente en versión 2026. Estado manual persistido en `localStorage` (`nw3-manual-mode`). Versiones 2012 y 2014 forzadas siempre a modo día.
- **Submenús (2014 y 2026)**: se cerraban demasiado rápido al mover el ratón del ítem padre al submenú. Solucionado con `visibility: hidden/visible` + `transition-delay: 0.15s` en lugar de `display: none/block`.

## [0.1.16] - 2026-05-22
### noticiasweb3 - Fix dropdown de navegacion en versiones 2026
- Corregido bug en `#access` de `.version-2026`: los submenus se renderizaban siempre visibles bajo cada item porque faltaba `display: none` y `position: absolute` por defecto, rompiendo el layout horizontal.
- Anadidas reglas `:hover > ul` y `.open > ul` para mostrar el submenu solo al interactuar.
- Anadido fondo, sombra, `width` fijo y `z-index` al desplegable en `.version-2026`.
- Forzado `overflow: visible` en `<ul>` y `<li>` del nav para que los dropdowns no se recorten en escritorio.
- Variantes platform-ios y platform-windows: el dropdown ahora usa `position: fixed` centrado sobre la nav inferior (con `max-height: 60vh` y scroll interno) para escapar del `overflow-x: auto` del nav y no cortarse en los bordes.
- Variante platform-android: estilos del submenu reforzados con fondo blanco y hover verde Material.
- `SiteHeader.jsx`: el `onClick` del `<li>` solo se asigna cuando el item tiene hijos, los clicks en sub-links no propagan al toggle y `openItem` se limpia al cambiar de ruta.

## [0.1.15] - 2026-05-17
### Web principal - Castellano y botones sociales
- Traducidos al castellano los textos principales de `apps/web`: cabecera, hero, secciones de valor, testimonios, llamada a la accion y footer.
- Restaurados botones visibles de Telegram e Instagram en las nuevas webs de canales (`resistencia-censura`, `comunidadtelebots` y `todosobregameplays`).
- Arreglado el selector de idiomas de la web principal conectando cabecera, portada y footer a traducciones locales con fallback ES/EN cuando PocketBase no devuelve traducciones.
- Anadida en la portada principal una seccion de tarjetas con enlaces a todas las webs del ecosistema: Todo sobre alltech, Noticiasweb3, Resistencia a la Censura, Comunidad Telebots y TodoSobreGameplays.
- Anadida activacion regional de Google Analytics por defecto: se activa automaticamente fuera de regiones que requieren consentimiento previo, y se mantiene bloqueado hasta aceptacion en UE/EEE/Reino Unido/Suiza.

### API - Clave de cifrado
- Corregida la validacion de `ENCRYPTION_KEY`: ahora acepta claves hex reales de 64 caracteres (`openssl rand -hex 32`) o claves de texto de 32 bytes.
- Actualizados `.env.example` y `apps/api/.env.example` para documentar la longitud correcta y evitar errores de arranque por longitud de clave.

### noticiasweb3 - Dominio alternativo DuckDNS
- Anadido `noticiasweb3.duckdns.org` como host alternativo del servicio Docker `noticiasweb3`, sirviendo la misma web que `noticiasweb3.todosobreall.tech`.
- Separado `noticiasweb3.duckdns.org` en un router Traefik independiente (`noticiasweb3-duckdns`) para solicitar su propio certificado SSL de Let's Encrypt sin mezclarlo con el certificado de `todosobreall.tech`.

### Monorepo - Comandos unificados
- Anadidos scripts raiz para gestionar todas las webs:
  - `npm run dev:webs` lanza todas las webs en desarrollo.
  - `npm run build:webs` compila todas las webs.
  - `npm run webs` reconstruye y levanta todos los servicios web con Docker Compose, incluyendo `web` (`todosobreall.tech`), `api` y `pocketbase`.
  - `npm run docker:webs` queda como alias de `npm run webs`.

### TodoSobreGameplays - Nueva web visor de Telegram
- Anadida la app `apps/todosobregameplays` como nueva web React + Vite del monorepo.
- Configurado el servicio Docker `todosobregameplays` con Traefik para el dominio `todosobregameplays.todosobreall.tech`.
- Creado visor publico del canal `https://t.me/TodoSobreGameplaysCanal` reutilizando el lector de Telegram, buscador, tarjetas, estadisticas, Google Analytics, `ads.txt` y espacios publicitarios visibles.
- Ampliado el endpoint API `/telegram-channel/:channel` para permitir tambien el canal `TodoSobreGameplaysCanal`.

## [0.1.14] - 2026-05-17
### comunidadtelebots - Nueva web visor de Telegram
- Anadida la app `apps/comunidadtelebots` como nueva web React + Vite del monorepo.
- Configurado el servicio Docker `comunidadtelebots` con Traefik para el dominio `comunidadtelebots.todosobreall.tech`.
- Creado visor publico del canal `https://t.me/comunidadtelebots` reutilizando el lector de Telegram, buscador, tarjetas, estadisticas, Google Analytics y espacios publicitarios visibles.
- Ampliado el endpoint API `/telegram-channel/:channel` para permitir tambien el canal `comunidadtelebots`.

## [0.1.13] - 2026-05-17
### resistenciaalacensura - Nueva web visor de Telegram
- Anadida la app `apps/resistencia-censura` como tercera web React + Vite del monorepo.
- Configurado el servicio Docker `resistencia-censura` con Traefik para el dominio `resistenciaalacensura.todosobreall.tech`.
- Creado visor publico del canal `https://t.me/resistencia_censura` con buscador, tarjetas de publicaciones, resumen de actividad y enlace directo a Telegram.
- Anadido endpoint API `/telegram-channel/resistencia_censura` para leer el preview publico de Telegram desde servidor y evitar problemas CORS en navegador.
- Anadida integracion de Google Analytics mediante `VITE_GOOGLE_ANALYTICS_ID`.
- Anadidas muestras visibles de espacios publicitarios en la nueva web: banner superior, lateral y bloque entre publicaciones.
- Anadido `apps/resistencia-censura/public/ads.txt` con la autorizacion de Google AdSense `pub-1927309987076600`.

### noticiasweb3 - Publicidad visible y slots de AdSense
- Anadidas muestras visibles de publicidad para `noticiasweb3` cuando AdSense no entrega anuncio o faltan slots reales.
- Anadido bloque publicitario interno junto a los banners superior y lateral existentes.
- Anadidas variables `VITE_ADSENSE_SLOT_TOP`, `VITE_ADSENSE_SLOT_RIGHT` y `VITE_ADSENSE_SLOT_INLINE` al `.env.example`, `docker-compose.yml` y `apps/noticiasweb3/Dockerfile`.
- Actualizado `AdSense.jsx` para usar anuncios reales solo cuando existen `VITE_ADSENSE_ID` y un `data-ad-slot` real; en local mantiene una maqueta visible como respaldo.

### API - Desarrollo local
- Ajustada la inicializacion del cliente PocketBase para registrar el fallo si PocketBase no esta disponible sin tumbar toda la API, permitiendo probar endpoints independientes como el visor de Telegram en local.

## [0.1.12] - 2026-05-16
### noticiasweb3 — 9 artículos adicionales (IDs 224041–224088)
- Añadidos 9 artículos verificados del canal @TodoSobreAllTech.
- Categoría Tecnología: luces router, Google Pixel 10, Irán cables submarinos, UE cable Polo Norte, El Corte Inglés teles outlet, contratación pública española, Amazon/Zaragoza inundaciones, refrigeración líquida vs aire CPU, cable Europa-África Orange.
- Todos incluyen `telegramUrl` con enlace directo al post del canal.
- Fechas del 13 al 16 de mayo de 2026.

## [0.1.11] - 2026-05-16
### noticiasweb3 + pocketbase — Canal de Telegram dinámico (223k posts)
- Añadida colección `telegram_channel_posts` en PocketBase (migración `1779000001`): campos `message_id` (único), `date`, `text`, `category` (IA/Tecnología/Ciberseguridad/Gaming/Otro), `telegram_url`, `has_photo`. Lectura pública, escritura solo interna.
- Creado `scripts/scrape-telegram-channel.mjs`: script Node.js sin dependencias que extrae todos los posts del preview público `https://t.me/s/TodoSobreAllTech?before={ID}`, los categoriza por keywords y los guarda en PocketBase con checkpoint reanudable.
- Creada página `/canal` (`CanalPage.jsx`): lista paginada (20/pág.) de posts con filtro por categoría, buscador de texto libre, badge de categoría con color y enlace directo a Telegram. Solo visible en modo 2026.
- Añadido enlace "Canal de Telegram" en la navegación principal, visible únicamente en modo 2026.
- Añadida variable `VITE_POCKETBASE_URL` al Dockerfile de noticiasweb3 y a docker-compose.yml.

## [0.1.10] - 2026-05-16
### noticiasweb3 — 13 artículos adicionales de mayo (13–16 mayo)
- Añadidos 13 artículos verificados del canal @TodoSobreAllTech (IDs 224040–224080).
- Categorías: 3 IA, 9 Tecnología, 1 Ciberseguridad.
- Artículos: Sony IA fotos, Cybertruck ruedas, crisis RAM smartphones, robot albañil lunar (China), informe Windows vs MacBook (Microsoft), Claude Mythos vuln macOS, NASA Psyche sobrevuelo Marte, Ormuz chips Samsung/TSMC, IA regla los servidores, Firefox selector UE, juicio Sam Altman OpenAI, NotebookLM vs Gemini, boyas centros datos China.
- Todos incluyen `telegramUrl` con enlace directo al post del canal.
- Fechas del 13 al 16 de mayo de 2026.

## [0.1.9] - 2026-05-16
### noticiasweb3 — 24 artículos de mayo desde el canal de Telegram
- Añadidos 24 artículos verificados del canal @TodoSobreAllTech (IDs 223431–224061).
- Categorías: 9 IA, 8 Tecnología, 5 Ciberseguridad, 2 Gaming.
- Todos los artículos nuevos incluyen `telegramUrl` apuntando al post original del canal.
- Fechas del 1 al 16 de mayo de 2026.

## [0.1.8] - 2026-05-16
### noticiasweb3 — Blog integrado en Novedades y Noticias
- Añadida pestaña "Blog" junto a "Noticias" en la página `/noticias` (solo modo 2026).
- Creado `src/data/blogPosts.jsx` con estructura de entradas: slug, título, fecha, autor, extracto y cuerpo.
- Creada `BlogPostDetailPage` con ruta `/blog/:slug`: muestra la entrada completa con enlace de vuelta al blog.
- Las entradas del blog muestran extracto + "Leer más →" en el listado.
- Badge rojo "Blog" para diferenciar visualmente las entradas de las noticias.
- Enlace "Ver en Telegram" aparece en el detalle cuando `telegramUrl` está relleno.
- La pestaña activa se preserva en la URL mediante query param `?tab=blog`.

## [0.1.7] - 2026-05-16
### noticiasweb3 — Páginas de detalle por artículo
- Extraído el array de artículos a `src/data/articles.jsx` para compartirlo entre páginas.
- Añadido campo `slug` a todos los artículos (25 en total) para URLs limpias.
- Creada `NoticiaDetailPage` con ruta `/noticias/:slug`: muestra título, categoría, fecha, fuente y cuerpo completo.
- Si `telegramUrl` está relleno, aparece enlace "Ver en Telegram" en la cabecera del artículo.
- Títulos del listado de noticias enlazan ahora a la página de detalle interna en lugar de a la fuente externa.
- Enlace "← Volver a noticias" en la cabecera y pie de cada detalle.

## [0.1.6] - 2026-05-16
### Infraestructura — GitHub Actions CI/CD
- Añadido `.github/workflows/deploy.yml`: redeploy automático en el VPS al hacer push a `main`.
- El workflow conecta al VPS por SSH, ejecuta `git pull` y reconstruye el contenedor `noticiasweb3`.
- Limpieza automática de imágenes Docker huérfanas tras cada despliegue.
- Requiere 3 secrets en GitHub: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`.

## [0.1.5] - 2026-05-16
### noticiasweb3 — Enlaces de noticias y campo telegramUrl

#### Noticias
- Añadido campo `telegramUrl` a los 15 artículos de 2026 para enlazar al post específico del canal de Telegram cuando esté publicado.
- Mientras `telegramUrl` esté vacío, el enlace apunta al canal general `https://t.me/todosobrealltech`.
- Títulos de artículos con fuente enlazados a la URL original de la noticia; artículos de 2014 sin fuente muestran el título como texto plano.
- Enlace "Fuente:" restaurado para apuntar siempre a la web original de cada noticia.

## [0.1.4] - 2026-05-16
### noticiasweb3 — Separación estricta versión 2014 / 2026

#### Noticias
- Añadidos 6 artículos verificados de mayo 2026 con fuente y enlace original (Google I/O, Anthropic, Android Show, Patch Tuesday, NGINX CVE, Xbox/Switch 2).
- Convertido el listado de noticias a array de datos con campo `year` para facilitar el filtrado por versión.
- Los artículos de 2026 solo se muestran en el modo 2026; el modo 2014 muestra únicamente los 10 artículos originales sin modificación.
- Buscador de noticias añadido exclusivamente al modo 2026 (con contador de resultados).

#### Separación 2014 / 2026
- `app-showcase` (sección de presentación Android/iOS/Windows) oculta en modo 2014; solo visible en modo 2026.
- Selector de plataforma (Android / iOS / Windows 11) en la cabecera oculto en modo 2014.
- Widgets de Telegram e Instagram en el sidebar ocultos en modo 2014; solo visibles en modo 2026.
- `siteVersion` propagado a todas las páginas hijas vía `cloneElement` para que cada componente pueda condicionar su contenido.

#### Correcciones
- Restaurado el texto original exacto del artículo "Descubren un Android con malware de fábrica" (2014) que había sido modificado por error.
- Eliminadas fechas aproximadas añadidas erróneamente a artículos de 2014 sin fecha original.

## [0.1.3] - 2026-05-16
### noticiasweb3 — Reconstrucción del diseño original de 2014
- Reescritura completa de `index.css` para replicar el tema *webme.com "clean"*: layout flotante, cabecera blanca con imagen submarina, tipografía PT Sans a 15 px, fondo tileado `#d9d6d1`, encabezados en `#b50433`, enlaces en `#1982d1`.
- Reestructurada la cabecera con `#claim`/`#inner-claim`/`#header-image` igual que el original: texto del sitio superpuesto sobre la imagen decorativa.
- Navegación restaurada con `line-height: 47px`, flecha PNG azul como icono, zoom + box-shadow en hover.
- Añadido `#content` wrapper con `box-shadow` lateral junto al sidebar `#e8e8e9`.
- Sidebar restaurado con widgets originales: Google Translate, Facebook Like Box y Twitter timeline `@GrupoNW3`.
- `HomePage` recuperada con el contenido original: anuncio de *Pan y Pastelería Anna*, banner *BEWATER* y botones de redes sociales (Facebook, Twitter, Tuenti).
- `NoticiasPage` completa con los 10 artículos originales de junio de 2014.
- Añadidas todas las rutas originales: `/pulseras-rojas`, `/play-station`, `/juegos-pc`, `/juegos-online`, `/sube-imagenes`, `/suscribirme`, `/afiliarte`, `/afiliados`, `/lista-vip`, `/foro`, `/grupo`, `/encuestas`, y páginas de detalle para extensiones, juegos PC y juegos online.
- SDK de Facebook y Twitter inyectados en `index.html` para activar los widgets sociales.

### noticiasweb3 — Publicidad
- Añadido componente `AdSense.jsx` que carga el script de Google AdSense dinámicamente desde `VITE_ADSENSE_ID` (no se inyecta nada si la variable está vacía).
- Añadidos bloques `#banner-top` (728×90) y `#banner-right` (160×600) en el layout.
- `VITE_ADSENSE_ID` propagado como `ARG`/`ENV` en el `Dockerfile` y pasado desde `docker-compose.yml`.

### todosobreall.tech — AdSense Auto Ads
- Añadido componente `AdSenseAutoAds.jsx` para activar los anuncios automáticos de Google AdSense en la web principal.
- `VITE_ADSENSE_ID` añadido al `Dockerfile` de `apps/web` y al `docker-compose.yml`.
- Añadido `ads.txt` público en `apps/web/public/` con el editor de Google AdSense.

### SEO — Sitemaps
- Añadido `sitemap.xml` completo para `noticiasweb3` con las 351 URLs indexables.
- Actualizado `sitemap.xml` de `todosobreall.tech` con las rutas principales y prioridades SEO.
- Añadida la variable `VITE_ADSENSE_ID` al `.env.example` raíz.

## [0.1.2] - 2026-05-16
### Feature - Nueva web Noticiasweb3
- Anadida la app `apps/noticiasweb3` como segunda web React + Vite dentro del monorepo.
- Anadidas rutas publicas para bienvenida, noticias, extensiones, pulseras rojas, PlayStation, juegos de PC, juegos online, subida de imagenes, suscripcion, afiliacion, lista VIP, foro, contacto, grupo y encuestas.
- Anadido layout propio con cabecera, menu desplegable, sidebar, footer y banners publicitarios.
- Anadido componente `AdSense` configurable mediante `VITE_ADSENSE_ID`, evitando hardcodear el identificador de cliente.
- Anadidos estilos base para recuperar la apariencia clasica de Noticiasweb3, con estructura de escenario, masthead, navegacion, contenido principal, sidebar y adaptacion responsive basica.
- Anadidos `Dockerfile` y `nginx.conf` para compilar y servir la web como SPA estatica.
- Anadido el servicio `noticiasweb3` a `docker-compose.yml`, con build independiente y labels de Traefik para publicarlo en `noticiasweb3.${WEB_HOST}`.
- Anadido `sitemap.xml` publico para `noticiasweb3`, incluyendo rutas principales y paginas de detalle disponibles.
- Anadido `ads.txt` publico para `noticiasweb3` con el editor de Google AdSense configurado.
- Anadido selector visual de versiones `2014`/`2026` en `noticiasweb3`, manteniendo el modo clasico y sumando una variante moderna tipo app.
- Anadida seccion de presentacion de app Android/iOS/Windows 11 en la home de `noticiasweb3`.
- Anadidos temas globales 2026 para Android Material Design, iOS estilo app y Windows 11 Fluent.
- Anadido modo noche automatico segun la hora local del usuario, con cambio de colores, fondos y superficies en toda la experiencia.
- Actualizado `sitemap.xml` publico de `todosobreall.tech` con las rutas indexables principales y prioridades SEO.
- Anadida integracion de Google AdSense Auto Ads en `todosobreall.tech`, con `ads.txt` publico y `VITE_ADSENSE_ID` disponible en el build Docker de `web`.
- Verificada la build de produccion de `apps/noticiasweb3`.

## [0.1.1] - 2026-05-16
### Feature - Compatibilidad con Traefik
- Anadidas labels de Traefik al servicio `web` para publicar la web por HTTPS.
- Anadida red externa configurable `TRAEFIK_NETWORK`.
- Anadidas variables `WEB_HOST`, `TRAEFIK_ENTRYPOINT` y `TRAEFIK_CERT_RESOLVER`.
- Documentado el despliegue con Traefik en `README.md`, priorizando reutilizar un contenedor/red Traefik existente.

## [0.1.0] - 2026-05-16
### Inicial - Importacion limpia desde Horizons
- Importado el monorepo base con `apps/web`, `apps/api` y `apps/pocketbase`.
- Eliminados secretos del export original: `.env` real, token de Telegram, claves y datos locales.
- Eliminada la base exportada de PocketBase (`pb_data`) y el binario local de PocketBase.
- Anadidos `.env.example` para raiz, API y web.
- Google Analytics queda configurado por variable `VITE_GOOGLE_ANALYTICS_ID`, sin ID hardcodeado.
- Anadidos Dockerfiles para web, API y PocketBase.
- Anadido `docker-compose.yml` para levantar la pila completa.
- Ajustado el cliente de API para usar `POCKETBASE_HOST` en despliegues Docker.
- Anadido `.gitignore` para evitar subir secretos, datos locales, builds y binarios.
# Captcha estricto sin excepciones

- Nuevo botón para reverificar colectivamente a los miembros conocidos, con progreso y entregas privadas.
- Vista previa, cancelación e historial de campañas disponibles desde el panel web.
- Programación mensual de reverificación y administración de usuarios exentos desde web y MiniApp.
- El panel de grupos de Moonbot permite activar el modo estricto por grupo.
- El estado se mantiene sincronizado con la MiniApp y fuerza el mute hasta superar la verificación.
- Nuevas opciones de administración por grupo:
  - activar/desactivar acceso condicional,
  - perfiles de captcha (permisivo, equilibrado y estricto),
  - re-verificación periódica programable (0, 7, 15, 30 y 90 días),
  - re-verificación personalizada por días.
- Se añadieron ajustes operativos de captcha:
  - máximo de intentos por usuario,
  - tiempo de caducidad del reto,
  - tiempo de gracia para escribir mensajes,
  - cadencia de reenvío de recordatorio.
- Se añadió acceso rápido para limpiar lista de exentos y alternar envío de aviso privado al unir.
# Publicidad automática de canales del master en NoticiasWeb3

- La API detecta respuestas HTML o corruptas de Moonbot y devuelve un error JSON controlado.
- Docker Compose fija `http://moonbot:5000` como ruta interna de la API sin permitir que un valor antiguo de `.env` la sustituya.
- La API publicitaria usa `http://moonbot:5000` como respaldo si la ruta interna configurada apunta a un destino inaccesible.
- Interruptor independiente para activar o detener la publicidad de cada canal del master.
- Los canales administrados por el master generan campañas propias medibles automáticamente.
- La entrega rota entre campañas con la misma prioridad según sus impresiones por ubicación.
- El panel identifica las campañas automáticas y mantiene AdSense como alternativa.
# Administración web: perfiles predefinidos

- Añadidos perfiles rápidos de soporte, contenido, seguridad, analítica, operaciones y administración completa.
- Separada explícitamente la autorización web del acceso a grupos Telegram; el master puede delegar grupos de forma adicional.
- Los perfiles se aplican desde invitaciones, elevaciones verificadas y cambios posteriores auditados.

# Changelog

## [0.0.652] - 2026-08-09 — Centro visual y apariencia Plus configurable
### Added
- Centro de apariencia a pantalla completa accesible desde el menú principal, con navegación independiente y flecha atrás.
- Galería visual para Android, Android Nuevo, Android Glass, Web, Webogram, iOS, macOS, Desktop, Windows/Unigram, Telegram X y Aurora.
- Selector por familia con todas las versiones históricas conservadas y ordenadas de la más moderna a la más antigua.
- Vista previa de conversación antes de aplicar, con acciones explícitas para aplicar o cancelar y restauración del diseño anterior.
- Pantalla «Crear diseño» organizada en Burbujas, Avatares, Navegación, Tipografía, Iconos y Animaciones.
- Comparador visual entre el tema activo y cualquier diseño alternativo.
- Accesos visibles a importación mediante enlace, exportación, compartir y ajustes avanzados existentes.
- Opción para utilizar la fuente del sistema sin reemplazar el perfil visual activo.
- Selector persistente del tamaño del panel de emojis: compacto, original del diseño o grande.
- Control para ocultar el número de teléfono propio en los menús compatibles.
### Changed
- El antiguo diálogo largo de apariencia permanece disponible como «Ajustes avanzados» y conserva paletas, fondos, patrones, editor, Plus Messenger, importación/exportación y restablecimiento.
- Las maquetas se generan con HTML y CSS, sin imágenes externas, y se adaptan a escritorio y móvil.
- Las preferencias visuales Plus se aplican inmediatamente al guardarlas o importarlas y también durante el arranque del cliente.
- Los nuevos ajustes se integran en el panel «Opciones Plus Messenger» y respetan Android, iOS, Web, Webogram, Desktop, Unigram, Telegram X, Aurora y sus versiones históricas.
### Security
- La importación conserva una lista cerrada de propiedades, exige booleanos y tamaños conocidos y continúa excluyendo sesiones, claves, tokens, chats y contactos privados.
### Tests
- 70 pruebas del centro visual y cinco pruebas específicas de preferencias Plus superadas; compilación Vite/PWA de producción verificada.
- Añadida una regresión que verifica la validación del tamaño de emojis y que aplicar opciones Plus no elimina las clases del diseño seleccionado.

## [0.0.651] - 2026-08-06 — Mensajería resistente y herramientas Plus
### Added
- Sonidos independientes y persistentes para mensajes recibidos y enviados; el nuevo sonido de salida es opcional.
- Reintentos acotados y deduplicación de mensajes y reacciones durante llamadas grupales, conservando el `randomId` MTProto.
- Vistas inteligentes Plus para usuarios, grupos, canales, bots, favoritos, no leídos y chats administrados.
- Ordenación opcional por no leídos, nombre o favoritos sin sustituir el orden predeterminado de Telegram.
- Selección múltiple accesible con acciones masivas de lectura, silencio y archivo.
- Detección runtime de capacidades MTProto para Passkeys, reventa y ofertas de regalos.
- Barra opcional de hasta seis chats recientes y navegación rápida accesible.
- Acciones configurables al hacer doble clic en mensajes, con exclusión de controles y multimedia.
- Calidad de fotografía Original, Alta, Equilibrada o Ahorro en envío y editor.
- Lista de conversaciones configurable en dos o tres líneas.
- Avisos opt-in y limitados de presencia/escritura para un máximo de veinte contactos seleccionados.
- Acción configurable al pulsar el avatar y copia/restauración segura de preferencias mediante JSON validado.
- Centro único «Opciones Plus Messenger» junto a Idioma, Dispositivos y Datos, con flecha atrás, controles activables y enlace al repositorio oficial.
### Security
- Los límites `FLOOD_WAIT/429` nunca usan reintentos rápidos.
- Preferencias resistentes a bloqueos de almacenamiento y tonos Web Audio con cierre garantizado.
- Ninguna operación financiera se habilita si falta un constructor MTProto requerido.
### Tests
- Suite completa y compilación Vite/PWA verificadas conjuntamente.

## [0.0.650] - 2026-08-06 — Reacciones extendidas para todos los diseños
### Added
- Buscador de reacciones por emoji y significado.
- Compactación automática a cinco reacciones con botón `+N` para desplegar el resto.
- Tooltip diferido con hasta cinco nombres reales de usuarios que reaccionaron.
- Reacción grande mediante doble clic y el parámetro MTProto oficial `big`.
### Changed
- Selector, buscador, botones y tooltips heredan superficies, colores, radios, sombras y modo oscuro de cada diseño.
- Adaptaciones específicas para estilos clásicos, Android Holo, Webogram, Telegram Desktop, iOS, macOS y Android Glass.
- Se conservan Stars, partículas, reacción predeterminada, modal de usuarios y sincronización de no leídas.
### Tests
- Suite completa de 35 pruebas y compilación Vite/PWA verificadas.

## [0.0.649] - 2026-08-06 — Prevención de fallos reportados por usuarios de Telegram Web
### Added
- Los comentarios y respuestas incluyen una acción real «Ver en el chat» para recuperar el contexto original.
### Fixed
- Los hilos muestran nombres reales y perfiles interactivos en lugar de identificadores numéricos.
- Las menciones visibles se confirman mediante `readAllChatMentions`, evitando contadores atascados entre dispositivos.
### Roadmap
- Registrados los riesgos oficiales de sincronización en llamadas grupales y separación de sonidos entrantes/salientes para su implementación verificable.
### Tests
- Suite completa y compilación Vite/PWA verificadas antes de publicar.

## [0.0.648] - 2026-08-06 — Remitentes y bloques de mensajes de grupo
### Fixed
- Los mensajes recibidos en grupos muestran el nombre real del usuario en vez de repetir el nombre del grupo.
- GramJS publica los perfiles resueltos en `UserStore` tanto en el historial principal como en comentarios e hilos.
- El nombre del remitente aparece una sola vez al comienzo de cada bloque consecutivo, como en los clientes oficiales de Telegram.
- Los mensajes propios quedan alineados a la derecha, sin avatar izquierdo y con la cola de burbuja correcta; los recibidos conservan el espacio estable del avatar.
- Un perfil que todavía está cargando ya no se confunde visualmente con el grupo.
### Tests
- Suite completa de 35 pruebas y compilación Vite/PWA verificadas.

## [0.0.647] - 2026-08-06 — Orden cronológico del selector visual
### Fixed
- Los selectores de cada familia muestran ahora la versión más moderna arriba y la más antigua abajo.
- El orden visual se calcula sobre una copia para no modificar el registro ni la selección persistida del usuario.
### Tests
- Añadida una prueba de regresión del orden descendente; suite completa de 35 pruebas y compilación Vite/PWA verificadas.

## [0.0.646] - 2026-08-05 — Compilación Docker reproducible
### Fixed
- Añadido `.dockerignore` para impedir que `node_modules` antiguos del servidor sobrescriban las dependencias instaladas dentro de la imagen.
- Evitada la mezcla de PostCSS 7 con Vite/PostCSS 8 que bloqueaba la compilación limpia de los perfiles visuales.
### Changed
- El contexto Docker excluye dependencias, artefactos, historial Git, cobertura y registros, reduciendo cientos de megabytes transferidos en cada actualización.

## [0.0.645] - 2026-08-05 — Stories, vídeo grupal y regalos con Stars
### Added
- Compositor de álbumes de hasta 20 Stories con miniaturas, orden, eliminación, texto y edición visual independiente por elemento.
- Publicación MTProto secuencial con progreso y recuperación de fallos parciales sin duplicar Stories ya enviadas.
- Recepción de vídeo y pantalla de participantes en llamadas grupales mediante endpoints y fuentes SIM/FID, con cuadrícula responsive para todos los perfiles visuales.
- Catálogo oficial de regalos con saldo, disponibilidad, mensaje, anonimato, mejora opcional y confirmación irreversible.
### Changed
- Las llamadas grupales renegocian el transporte principal al cambiar las fuentes remotas y separan los streams de vídeo por participante.
- El envío de regalos usa el flujo real `GetStarGifts` → `InputInvoiceStarGift` → `GetPaymentForm` → `SendStarsForm`.
### Fixed
- Sustituida la llamada inexistente `Api.payments.SendStarGift`, que impedía completar compras reales.
- Los álbumes conservan únicamente los elementos pendientes después de un fallo para que reintentar sea seguro.
### Security
- Validación de identificadores de regalo, límite de mensaje, saldo y doble confirmación antes de cualquier pago.
- Suite completa de 34 pruebas, compilación Vite/PWA y auditoría sin vulnerabilidades moderadas, altas ni críticas.

## [0.0.644] - 2026-08-05 — Editor multimedia y refuerzo web
### Added
- Editor multimedia reutilizable para mensajes y Stories, con recorte real, giro, volteo, brillo, contraste, restauración y previsualización Canvas.
- Exportación segura a PNG o JPEG y pruebas unitarias de las transformaciones de imagen, selector de diseño y destinos externos.
### Changed
- El selector de diseño se sincroniza al cambiar de perfil o versión desde otra interfaz y conserva correctamente la etiqueta y el color de cada familia.
- Los mapas de código de producción quedan desactivados por defecto y pueden habilitarse explícitamente con `GENERATE_SOURCEMAP=true`.
- Nginx incorpora cabeceras de protección sin impedir llamadas, geolocalización, Mini Apps ni contenido multimedia.
### Fixed
- Sustituir documentos, vídeos u otros archivos no gráficos conserva el flujo anterior; solo las imágenes abren el nuevo editor.
- Los clics de notificaciones y el visor AMP rechazan destinos externos inseguros.
### Security
- Eliminados registros de teléfono, `phoneCodeHash`, tokens push y otros datos sensibles del navegador.
- Auditoría de producción verificada sin vulnerabilidades moderadas, altas ni críticas; permanecen cuatro avisos bajos indirectos cuya corrección automática es incompatible.

## [0.0.643] - 2026-08-05 — Ubicación en directo completa
### Added
- Selector previo para compartir la ubicación durante 15 minutos, 1 hora u 8 horas desde cualquier perfil visual.
- Pruebas unitarias para las duraciones admitidas y las distintas respuestas de mensaje de GramJS.
### Changed
- El panel activo usa `watchPosition` de alta precisión y limita las ediciones a una cada 15 segundos.
- La interfaz muestra errores de permisos, geolocalización, envío y respuestas incompletas de Telegram.
### Fixed
- Corregida la extracción del identificador desde `UpdateNewMessage`, necesaria para editar y detener la ubicación enviada.
- La detención y el desmontaje liberan correctamente el seguimiento del navegador y los temporizadores.

## [0.0.642] - 2026-08-03 — Migración completa a Vite
### Security
- Retirados Create React App, `react-app-rewired`, `worker-loader`, `sw-precache` y su cadena de dependencias abandonada.
- La auditoría baja de 200 alertas iniciales a 6 bajas indirectas, sin vulnerabilidades moderadas, altas ni críticas.
- Service worker migrado a Workbox con navegación segura, limpieza de cachés antiguas y apertura validada de notificaciones.
### Changed
- Compilación, desarrollo, pruebas y análisis de paquetes funcionan ahora con Vite 7 y Vitest.
- GramJS conserva los polyfills de navegador; los workers de caché y compresión usan módulos nativos de Vite.
- Se mantiene íntegramente la interfaz React y todos sus perfiles visuales.
### Fixed
- Eliminados imports CommonJS dinámicos y un import inexistente que Webpack toleraba silenciosamente.
- Restaurada la importación segura de SVG como componentes React.

## [0.0.641] - 2026-08-03 — Refuerzo de dependencias
### Security
- Actualizado el entorno de compilación desde Create React App 3 a la última versión estable de su línea, eliminando todas las alertas críticas detectadas inicialmente.
- Actualizados i18next, react-i18next, universal-cookie y las herramientas de desarrollo mantenidas.
- Retirados `tdweb` sin uso y `recompose`; su única utilidad empleada, `compose`, queda implementada localmente sin dependencias vulnerables.
- Declarados explícitamente los polyfills y el almacenamiento que GramJS usa en Webpack 5, evitando dependencias accidentales.
### Changed
- El análisis de código queda separado de la compilación de producción para poder modernizar gradualmente las reglas heredadas sin bloquear despliegues.
- Versión del cliente elevada a 0.0.641; compilación de producción verificada.
### Remaining
- Las alertas restantes pertenecen principalmente a la cadena abandonada de Create React App y `sw-precache`; su retirada completa requiere migrar el empaquetado a Vite/Workbox sin alterar los diseños históricos.

## [0.0.640] - 2026-08-03 — Anuncios oficiales de Telegram
### Added
- Flujo obligatorio de anuncios oficiales para canales y bots mediante `messages.getSponsoredMessages`.
- Tarjetas con título, texto, etiqueta Patrocinado/Recomendado, botón oficial e información del anunciante.
- Registro correcto de visualizaciones y clics mediante `viewSponsoredMessage` y `clickSponsoredMessage`.
- Flujo de denuncia con las opciones devueltas por `reportSponsoredMessage`.
### Changed
- Los resultados se conservan durante cinco minutos, según la especificación oficial.
- En canales se respeta `posts_between`; sin esa indicación aparecen después de las publicaciones. En bots se muestran como barra superior.

## [0.0.639] - 2026-08-03 — Campañas comunitarias entre publicaciones
### Added
- Los canales muestran una campaña aprobada de TodoSobreAllTech integrada entre sus publicaciones, con imagen opcional, llamada a la acción y enlace de clic medido.
- La carga usa el catálogo público con rotación y nunca inserta campañas en grupos ni conversaciones privadas.
- Las tarjetas reutilizan las variables visuales de cada diseño y se ocultan cuando el usuario activa `Mantener diseño original`.
### Fixed
- Los mensajes patrocinados nativos y las campañas comunitarias fuerzan ahora la actualización visual al terminar su carga asíncrona.

## [0.0.638] - 2026-08-03 — Compatibilidad funcional en todos los diseños
### Added
- El selector de versiones muestra en todas las familias el estado funcional activo y un control para conservar únicamente las funciones propias de la época.
- Cada versión visual puede usar las funciones actuales sin abandonar su apariencia original; la API moderna permanece activa en ambos modos.
- Los detalles de canales y grupos muestran la comunidad o chat de debate enlazado obtenido mediante MTProto y permiten abrirlo directamente.
- Comunidades enlazadas con descubrimiento de grupos y canales relacionados, navegación, enlace y desvinculación desde los detalles del chat.
### Changed
- La preferencia `tg_design_legacy_features` queda sincronizada entre el selector de versión, Ajustes y el menú principal.
- El panel de compatibilidad se adapta a las variables visuales de cada familia y a pantallas móviles.
- El manifiesto de paridad registra 32 capacidades completas, 2 parciales y ninguna pendiente de las 34 auditadas.

## [0.0.637] - 2026-08-03 — Voz, navegador interno y presentación grupal
### Added
- Grabación y envío real de notas de voz con formatos compatibles, contador, cancelación, permisos y estados de Telegram.
- Navegador interno seguro con hasta diez pestañas, historial, recarga, barra de dirección y apertura externa.
- Compartir pantalla o cámara mediante un transporte WebRTC de presentación independiente y `phone.joinGroupCallPresentation`.
### Security
- El navegador admite únicamente HTTP/HTTPS, elimina credenciales de URL y aísla los iframes sin cámara, micrófono, geolocalización ni referencia.
### Changed
- El roadmap interno registra 31 capacidades completas de 33 auditadas.
### Remaining
- El vídeo nativo de participante requiere integrar fuentes SIM/FID en el transporte principal; cámara y pantalla ya funcionan como presentación.

## [0.0.636] - 2026-08-03 — Audio WebRTC para chats de voz
### Added
- Unión y salida reales de chats de voz mediante `phone.joinGroupCall` y `phone.leaveGroupCall`.
- Generación del payload WebRTC requerido por Telegram con SSRC, ICE, DTLS y fingerprints.
- Conexión al SFU, reproducción de participantes, actualización periódica de fuentes y comprobación de reconexión.
- Micrófono silenciado al entrar, activación voluntaria y sincronización del mute con Telegram.
### Architecture
- Nuevo controlador grupal independiente del protocolo cifrado P2P de llamadas privadas.
- Recuperada y adaptada la negociación multipista utilizada históricamente por Telegram React.
### Remaining
- La publicación de vídeo y la presentación de pantalla siguen pendientes de su conexión WebRTC independiente.

## [0.0.635] - 2026-08-03 — Ajustes completos y chats de voz ampliados
### Added
- Transferencia real de regalos a usuarios mediante doble confirmación, validación del destinatario y coste visible.
- Chats de voz con invitaciones, grabación de audio o vídeo, suscripción a sesiones programadas y moderación individual de participantes.
- Acceso real a Ajustes de chat y al creador de Carpetas en Android y demás familias visuales compatibles.
### Changed
- Los controles administrativos de chats de voz se adaptan a los permisos efectivos devueltos por Telegram.
- Corregido el mapeo de conversión, mejora, exportación y reembolso de regalos guardados.
- Ajustes pasa a completo en el manifiesto: ya no quedan acciones “Próximamente”.
### Compatibility
- La reventa permanece deshabilitada porque la capa TL instalada no permite publicar un precio.
- Audio, vídeo y pantalla en llamadas grupales siguen requiriendo una futura capa `tgcalls`/SFU.

## [0.0.634] - 2026-08-03 — Administración de chats de voz y seguridad WebApp
### Added
- Panel real de chats de voz para grupos y supergrupos: detección, creación inmediata o programada, inicio, participantes, título, silencio inicial, invitación y finalización.
- Perfiles oficiales de descarga automática bajo, medio y alto, con límites y preferencias preservadas al sincronizar con Telegram.
### Security
- Mini Apps restringen mensajes entre ventanas al origen y ventana esperados y validan enlaces HTTP/HTTPS.
- Markdown y documentos bloquean protocolos peligrosos e inyección mediante atributos de enlaces.
- Los enlaces seguros gestionan correctamente ventanas emergentes bloqueadas.
### Roadmap
- Llamadas grupales pasan a estado parcial: la administración ya funciona y queda pendiente el transporte `tgcalls` para audio, vídeo y pantalla.
- Stars y regalos vuelve honestamente a parcial hasta integrar transferencia y reventa completas.

## [0.0.633] - 2026-08-03 — Paridad funcional avanzada
### Added
- Gestión real de respuestas rápidas y bots conectados de Telegram Business.
- Selector y envío real de efectos disponibles en los mensajes, compatible con el modo histórico opcional.
- Búsqueda, paginación y fijado de carpetas de Mensajes guardados.
- Unión directa a canales similares con estados de progreso y error.
- Acciones reales para guardar, ocultar, convertir y mejorar regalos de Telegram Stars.
### Changed
- El manifiesto verificable de paridad alcanza 29 de 31 familias completas; solo quedan ajustes avanzados y llamadas grupales.
### Verification
- Constructores de GramJS y sintaxis JSX/JavaScript comprobados antes de publicación.

## [0.0.632] - 2026-08-03 — Paridad funcional configurable entre versiones
### Added
- Botón `Solo funciones de la época` disponible en Android, Unigram, Desktop, iOS, macOS y perfiles web.
- La preferencia queda guardada localmente y puede revertirse con `Mostrar funciones actuales`.
### Changed
- Por defecto, las variantes históricas cambian exclusivamente el diseño y conservan todas las funciones modernas.
- En modo histórico se ocultan solo accesos visuales modernos; la API, sesión, cifrado y backend continúan siendo los actuales.
### Compatibility
- No se modifican hojas de estilo, nombres de diseño ni preferencias existentes.

## [0.0.631] - 2026-08-03 — Ajustes por familia visual
### Added
- Menú funcional de Apariencia, Idioma, Dispositivos, Datos y Stickers para Unigram, Desktop, iOS, macOS, Web K/A, Webogram, Aurora y Telegram X.
- Android conserva su drawer y overlay propios en todas sus versiones históricas.
- Fuera de Android, Datos y almacenamiento utiliza los diálogos y listas Material ya tematizados por cada perfil; no se añaden estilos globales ni se sustituyen diseños existentes.
### Fixed
- El botón de menú de perfiles no Android ya no queda sin panel asociado.

## [0.0.630] - 2026-08-03 — Datos y stickers integrados en Ajustes
### Added
- Nuevo panel funcional de datos y almacenamiento reutilizando el overlay Android existente: muestra uso y cuota, solicita persistencia, gestiona el permiso de notificaciones y elimina solo cachés temporales.
- La fila `Stickers & Emoji` abre el gestor real de stickers favoritos ya incluido en el cliente.
- El manifiesto de paridad incorpora estas dos capacidades como completadas y verificadas por archivo.
### Security
- La limpieza de caché no elimina IndexedDB, sesiones, chats ni credenciales; se limita a la API `CacheStorage` del navegador.

## [0.0.629] - 2026-08-03 — Paridad verificable con Telegram Web
### Added
- Manifiesto público `public/data/telegram-web-parity.json` con 27 familias funcionales, estado `complete`, `partial` o `pending`, evidencia en código y bloqueos reales.
- Los ajustes Android permiten solicitar el permiso real de notificaciones, consultar el almacenamiento utilizado, abrir el selector de idioma y acceder a soporte/FAQ.
- Se mantienen intactos todos los temas y diseños existentes; las mejoras reutilizan filas, diálogos y snackbars actuales.

## [0.0.627] - 2026-06-27 — Bugfix: CSS visual (todos los temas)
### Fixed
- **Bug #5 (Material You)**: selector de tema completamente invisible sobre header morado → pill blanca con `rgba(255,255,255,0.16)` background
- **Bug visual Folders 2019 / Material 2015**: selector casi invisible → pills con contraste adecuado
- **Bug #6 (Rediseño 2026)**: botones InstantView / AMP sin borde ni color en burbuja azul saliente → texto y borde blancos
- **Bug #7 (Rediseño 2026)**: ícono de llamada cancelada invisible en burbuja azul saliente → `color: rgba(255,255,255,0.85)`
- **Bug #8 (Rediseño 2026)**: botón "+" de añadir reacción invisible en burbuja azul saliente → border y color blancos
- **Bug #1 global**: título "Telegram" del header izquierdo se cortaba cuando hay muchos botones → `min-width: 32px` en grow div + reducción de padding de botones a 6px/36px

## [0.0.626] - 2026-06-27 — Bugfix: JS críticos + UI Settings
### Fixed
- **downloadFile**: `e.lesser is not a function` — `String(gMedia.size)` en vez de `Number()` para conversión segura de BigInt nativo de GramJS
- **getSavedStarGifts**: `this.getInputPeer is not a function` — corregido a `tdlibChatIdToInputPeer(chat_id, this._entityCache)`
- **getBusinessInfo**: guard `if (!Api.account?.GetBusinessInfo)` para versiones de GramJS sin esta API
- **terminateSession 406**: `FRESH_RESET_AUTHORISATION_FORBIDDEN` ahora muestra Snackbar con mensaje explicativo en vez de fallo silencioso
- **Active Sessions z-index**: Dialog con `zIndex: 1400` para evitar solapamiento con el fondo del chat en primera apertura
- **Settings submenus**: Notifications, Data & Storage, Chat Settings, Chat Folders ahora muestran Snackbar "próximamente" en vez de no hacer nada

## [0.0.625] - 2026-06-20 — W4 Calls: Conectando... status + CSS design overrides
### Added
- **W4 Call UI polish** — Estado "Conectando..." cuando ACTIVE y duration === 0 (antes de que empiece el audio)
  - `ActiveCall.js`: `isConnecting = callState === ACTIVE && duration === 0` → `statusLabel = 'Conectando...'`
  - `ActiveCall.css`: overrides para `design-ios` (radius 24px, bg #1c1c3a), `design-tdesktop` (radius 12px), `design-aurora` (gradient + purple avatar pulse)
  - `IncomingCall.css`: mismos overrides para los tres temas
  - `min-height: 20px` en `.active-call-duration` para evitar salto de layout al cambiar texto

## [0.0.624] - 2026-06-20 — W3 Calls: Rating dialog + setCallRating
### Added
- **W3 Call rating** — `CallRatingDialog` (estrellas 1-5) se abre automáticamente al finalizar llamada
  - Estado `CallState.ENDED` dispara el dialog con el `call_id` guardado
  - Rating < 4: muestra campo de comentario opcional
  - Botón "Enviar" llama `setCallRating` → `phone.SetCallRating` en GramJsController
  - Botón "Omitir" cierra sin enviar
  - Montado en `MainPage.js` junto a `IncomingCall` / `ActiveCall`

## [0.0.623] - 2026-06-20 — W2 Calls: Tono de llamada (Web Audio API)
### Added
- **W2 Call tone** — `src/lib/CallTone.js` usando Web Audio API puro (sin archivos de audio)
  - `startRingTone('ring')`: tono de llamada entrante (440+480 Hz, 1s ON / 3s OFF)
  - `startRingTone('ringback')`: tono de espera saliente (440 Hz, 1s ON / 2s OFF)
  - `stopTone()`: corta el tono en todos los estados (accepted, discarded, active, idle)
  - Integrado en CallController: ring al recibir llamada, ringback al iniciar, stop al aceptar/rechazar/activo

## [0.0.622] - 2026-06-20 — W1 Calls: Fix doble dispatch + ICE servers
### Fixed
- **W1 Call bugs**: eliminado bloque de despacho directo que causaba que `UpdatePhoneCall` se procesara dos veces
  - Segunda vuelta: estado ya era `INCOMING` → `_sendDiscardBusy()` se llamaba automáticamente → llamada descartada antes de mostrarse
  - Eliminado `ReceivedCall` duplicado en `_acceptCall` (ya lo envía `_onCallRequested`)
  - `_extractIceServers` ahora distingue `PhoneConnectionWebrtc` (TURN/STUN) de `PhoneConnection` (legacy UDP relay no usable en WebRTC estándar); fallback a Google STUN

## [0.0.621] - 2026-06-20 — B2 Admin Management Panel
### Added
- **B2 Admin Management** — Panel de gestión de admins en ChatDetails (grupos/canales supergrupo)
  - Nuevo item "Administradores" en la sección de acciones del chat
  - `AdminManagement` panel lateral: lista todos los admins via `getChannelAdmins` (channels.GetParticipants con ChannelParticipantsAdmins)
  - Click "Editar" abre subvista con toggles de 10 permisos individuales + campo de título
  - Click "Quitar" revoca los privilegios admin vía `editAdmin` (rights vacíos)
  - Botón Guardar aplica cambios via `editAdmin` con los rights seleccionados y rank
  - CSS panel lateral derecho con `var(--)`, adaptado a todos los temas
  - `_getChannelAdmins` nuevo método en GramJsController

## [0.0.620] - 2026-06-20 — J1 Sponsored Messages UI
### Added
- **J1 Sponsored Messages** — Inyección en MessagesList para canales
  - Carga `getSponsoredMessages` al abrir un canal (por chat_id)
  - Mensajes patrocinados aparecen al final de la lista con etiqueta "Patrocinado" en azul
  - `IntersectionObserver` (threshold 0.5) llama `viewSponsoredMessage` cuando el mensaje se hace visible
  - Se limpian al cambiar de chat (no-canal resetea a `[]`)
  - CSS con `var(--)` adaptado a todos los temas

## [0.0.619] - 2026-06-20 — E2 Emoji Groups en EmojiPickerButton
### Added
- **E2 Emoji Groups** — Barra de grupos de emoji encima del picker (solo tab emoji)
  - Carga `getEmojiGroups` en `componentDidMount`
  - Scroll horizontal de botones-emoji (primer emoticon de cada grupo como icono)
  - Click en grupo inserta ese emoji directamente vía `onSelect`
  - Tooltip con el título del grupo; CSS con `var(--)` adaptado a todos los temas

## [0.0.618] - 2026-06-20 — F1 Attach Menu Bots UI
### Added
- **F1 Attach Menu Bots** — AttachButton carga `getAttachMenuBots` en `componentDidMount`
  - Bots del menú adjuntar aparecen como items adicionales en el menú paperclip
  - Click en un bot llama `requestSimpleWebView` y abre la URL en nueva pestaña
  - No modifica bots existentes; solo agrega dinámicamente los del servidor

## [0.0.617] - 2026-06-20 — J3 Live Location UI
### Added
- **J3 Live Location UI** — Botón "Ubicación en vivo" en el menú adjuntar (paperclip)
  - Obtiene la geolocalización del navegador y llama `sendLiveLocation` (GramJS)
  - Nuevo `LiveLocationPanel` anclado en InputBoxControl: cuenta regresiva MM:SS, punto verde animado, botón "Detener"
  - Ciclo `setInterval` de 30s actualizando la posición con `editLiveLocation` (nuevo método GramJS)
  - Botón "Detener" manda `editLiveLocation({stopped:true})` y cancela el ciclo
  - `_editLiveLocation` en GramJsController usa `messages.EditMessage` con `InputMediaGeoLive({stopped})`
  - CSS con `var(--)`, adaptado a todos los temas



## [0.0.616] - 2026-06-20 — Sprint autónomo: features completas
### Added (todos los CSS usan `var(--)`, adaptados a 46 clases design-*)

**A — Privacidad y Datos**
- `[0.0.606]` **A1 Privacy Panel** — `account.GetPrivacy/SetPrivacy` para 9 keys (StatusTimestamp, PhoneNumber, ProfilePhoto, PhoneCall, Forwards, ChatInvite, VoiceMessages, About, Birthday). Panel en Settings: Everyone/Contacts/Nobody.
- `[0.0.607]` **A2 Global Privacy** — `account.GetGlobalPrivacySettings/SetGlobalPrivacySettings`. Toggles: archive+mute, keep unarchived, hide read marks, require premium.
- `[0.0.608]` **A3-A5 Account & Data** — `GetAccountTTL/SetAccountTTL` (30/90/180/365 días), `GetContentSettings/SetContentSettings` (contenido sensible), `GetAutoDownloadSettings/SaveAutoDownloadSettings`.

**B — Admin Canales/Grupos**
- `[0.0.609]` **B1-B4** — `channels.GetAdminLog` + panel Recent Actions en ChatDetails; `channels.EditAdmin` (rangos/permisos/rank); `messages.GetChatInviteImporters(requested)+HideChatJoinRequest` panel Join Requests aprobar/rechazar; `channels.ToggleJoinToSend/ToggleJoinRequest`.

**E — Stickers/Emoji**
- `[0.0.610]` **E1-E3** — `messages.GetFavedStickers+FaveSticker` (panel FavedStickers con quitar); `messages.GetEmojiGroups` (categorías disponibles vía dispatch); `messages.GetStickerSet(InputStickerSetAnimatedEmoji)`.

**D — Business**
- `[0.0.611]` **D1-D5** — `account.UpdateBusinessGreetingMessage/AwayMessage/WorkHours/Location/Intro`. BusinessEditor en BusinessInfo: editar intro y ubicación.

**F — Mini Apps / Bots**
- `[0.0.612]` **F1-F2** — `messages.GetAttachMenuBots`; `messages.GetBotApp + RequestAppWebView + RequestSimpleWebView`.

**C — Stats / Monetización**
- `[0.0.613]` **C1-C4** — `stats.GetMessageStats/GetMegagroupStats/GetMessagePublicForwards`; `stats.GetBroadcastRevenueStats + payments.GetStarsRevenueStats`. Panel ChannelStats en ChatDetails (TON + Stars revenue).

**G — Stories**
- `[0.0.614]` **G1-G2** — `stories.SendReaction` (emoji/paid/empty); `stories.TogglePinned + GetPinnedStories`.

**H — Stars**
- `[0.0.615]` **H1-H2** — `payments.GetStarsTopupOptions`; `payments.GetPaymentForm + SendPaymentForm` (credentials stars para paid media).

**J — Sueltos**
- `[0.0.616]` **J1-J4** — `messages.GetSponsoredMessages + ViewSponsoredMessage`; `chatlists.ExportChatlistInvite`; `sendLiveLocation` vía `InputMediaGeoLive`; `messages.GetSearchCounters` (photo/video/doc/url/audio/voice/gif).

**I — Llamadas de grupo**: documentado en `TODO_PENDIENTE.md` (bloqueado por WebRTC).

---

## [0.0.603] - 2026-06-20
### Added
- **Enviar con Efecto** (Send with Effect) — paridad con Telegram Android/iOS
  - Botón ✨ junto al botón Enviar; aparece solo si el servidor devuelve efectos disponibles
  - Llama `getAvailableMessageEffects` al montar el componente
  - Picker emergente con grid de efectos seleccionables; el efecto activo queda resaltado
  - Pasa `effect_id` en `sendMessage`; se limpia automáticamente tras enviar
  - El indicador `✨` ya existente en `Message.js` muestra los efectos recibidos
  - CSS con skin adaptado: `.effect-picker-popup` usa variables de tema

- **Gestión de Carpetas de Chat** (Chat Folder Management) — paridad con Telegram Android
  - Las pestañas de carpetas ahora se muestran **siempre** (incluso con 0 carpetas) con tab "Todos"
  - Botón `+` al final de los tabs para crear una carpeta nueva
  - Diálogo `createChatFilter` con campo de nombre (máx. 12 caracteres, Enter para confirmar)
  - Botón `×` visible al hacer hover sobre cada tab para eliminar la carpeta (`deleteChatFilter`)
  - Iconos emoji por `icon_name` del filtro (Personal 👤, Work 💼, Bots 🤖, etc.)
  - Ayudante `getFolderIcon()` con tabla de iconos predefinidos
  - CSS nuevos: `.folder-tab-add`, `.folder-tab-delete`, `.folder-tab-icon`

### Build
- `npm run build` pasa sin errores ni warnings

## [0.0.602] - 2026-06-17
### Verified
- Inline bot results functionality fully implemented and working
  - `_getInlineBotResults()` in GramJsController resolves bot by username and fetches inline results
  - `detectInlineBot()` in InputBoxControl detects `@username query` pattern with 300ms debounce
  - `InlineBotResults` component renders results in list or grid layout
  - `handleInlineBotSelect()` sends selected result via `sendInlineBotResult`
  - Complete flow: GramJsController → InputBoxControl → InlineBotResults

- Build passes clean, no errors
- Normal input flow verified: text messages, commands (/), mentions (@user) all working
- Panel positioned correctly with proper styling and animations

## [0.0.601] - Previous
- Earlier versions

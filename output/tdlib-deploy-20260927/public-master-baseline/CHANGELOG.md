# Changelog - Moon Multibot

## [v16.85.0] - 2026-08-16
### Feature - Ecosistema Alfa 3D Heavy Transport & Arcade Adaptativo iOS/Android
- **Motor 3D Real en Three.js (`web/transport-3d.html`)**:
  - Camión pesado europeo Aster Viento Scania 770 S V8 con cabina de perfil alto, bocinas cromadas, visera, faldones aerodinámicos y semirremolque Tridem corrugado *Euro Freight*.
  - Cinemática de dirección real con manguetas delanteras pivotantes (`A`/`D`), giro de ruedas sincronizado y cámara de persecución orbital 360° libre.
  - Cabina de 1ª persona (*Cockpit*) con volante giratorio texturizado, retrovisores laterales, cuadro digital VDO y pantalla táctil GPS.
  - Texturado completo de entorno: asfalto con señalización vial, suelo forestal y manto vegetal bajo los árboles, estratos de acantilados y tráfico rodado con sedanes, furgones de reparto (*Express 24h*, *SAMUR 112*) y SUVs con llantas de aleación.
  - Conexión de los 23 módulos de transporte del repositorio (Terminal Canva de 12 secciones, Tacógrafo Digital Inteligente UE 561/2006, Emisora Radio CB CH-19/9/1/11, Pórticos de Báscula Dinámica WIM en autopista y Campaña Caja 07-A).
- **Arcade Adaptativo Multi-Plataforma (`web/games.html`)**:
  - Adaptación nativa de 4 sistemas de diseño: **iOS Modo Día (Cupertino)**, **iOS Modo Noche (OLED Dark)**, **Android Modo Día (Material 3 Light)** y **Android Modo Noche (Material Dark)**.
  - Barra selectora rápida para alternar plataforma y tema, con auto-detección según el dispositivo y `tg.colorScheme`.
  - Minijuegos táctiles: Cyber Snake con D-Pad virtual y gestos swipe, 2048 Cyber, Tres en Raya con IA y Memoria Cuántica.

## [v16.84.5-alpha] - 2026-08-15
### Feature - Suite de 23 Módulos de Simulación y Transporte Canva
- **Integración de Suite Modular de Transporte (`web/transport-*.js`)**:
  - `transport-adaptive-hud.js`: HUD dinámico con telemetría de viaje, velocidad, combustible y avisos de tacógrafo.
  - `transport-adr-tunnel-routing.js`: Ruteo inteligente con restricciones de mercancías peligrosas ADR en túneles.
  - `transport-commercial-properties.js` & `transport-economy-market.js`: Mercado económico, finanzas y adquisición de garajes comerciales.
  - `transport-community-events.js` & `transport-connected-systems.js`: Eventos mundiales en convoy y sincronización multijugador.
  - `transport-digital-tachograph.js`: Monitorización de tiempos de conducción continua y descansos obligatorios.
  - `transport-dynamic-wim-scale.js`: Evaluación de peso por eje en básculas Weigh-In-Motion a velocidad de crucero.
  - `transport-intermodal-reachstacker.js`: Logística portuaria y manipulación de contenedores marítimos.
  - `transport-player-progression.js`: Niveles de experiencia de conductor, licencias y reputación de empresa.
  - `transport-story-campaign.js`: Campaña narrativa del cuaderno de bitácora familiar y entrega especial de la Caja 07-A.
  - `transport-ui-shell.js` & `transport-ui-data-binding.js`: Terminal de a bordo estilo Canva con 12 pestañas interactivas.
- **Librería de Texturas de Alta Fidelidad Canva (`web/canva-assets/`)**:
  - Texturas para tacómetro digital, pantalla GPS, display de radio CB, libreas de flota (*Rutas del Continente*, *SAMUR 112*, *Trans-Ibérica*) y señalización vial europea.

## [v16.84.1] - 2026-07-24
### Feature - Ecosistema de Canales, Mini App Hub y Backend PocketBase
- **Telegram Mini App Hub (`web/hub.html`)**:
  - Panel móvil optimizado para Telegram WebApp con autenticación criptográfica de `initData` frente a `@CintiaBot`.
  - Pestañas de gestión: *Mis canales vinculados*, *Directorio comunitario*, *Administración de grupos* y monitor de proxies en tiempo real.
- **Backend PocketBase & Estadísticas (`core/pb_client.py`, `core/channel_stats.py`)**:
  - Registro automatizado de canales, verificación de roles de administrador y sincronización de snapshots de audiencia.
- **Red de Anuncios Mutuos & Dispatcher (`moon_multibot.py`, `core/routes_public.py`)**:
  - Motor de intercambio y difusión cruzada de anuncios entre canales comunitarios.
  - Generador dinámico de imágenes promocionales con estadísticas (`core/image_gen.py`).
- **Pasarela Pública de Acceso a Canales (`web/join.html`)**:
  - Landing de redirección con validación anti-abuso para unión a canales y grupos comunitarios.

## [v16.84.0] - 2026-07-11
### Feature - Proxies MTProto en CintiaBot (pedir, recomendar, administrar)
- **`/proxy`**: envía al usuario los proxies MTProto propios + los del canal más cercanos a su zona, deducida por el `language_code` de Telegram (un bot no ve la IP). Botón "Pedir proxy" en `/start` (callback `req_proxy`).
- **`/recomendar <enlace>`**: cualquier usuario recomienda un proxy MTProto; el bot lo valida (TCP-check), lo deja pendiente (`db["PENDING_PROXIES"]`) y avisa al **master** con botones ✅/❌. Al aprobar, se publica automáticamente en la web vía `POST /mtproto-proxies/community` de la API (autenticado por token compartido).
- **`/pendientes`**: cola de proxies recomendados por revisar, con botones de aprobar/rechazar en cada uno.
- **`/estado`** y **`/historico`**: usuarios activos por país y conexiones por hora/día de los proxies, consultados a la API.
- **Los datos de proxies** vienen de la API `mtproto-proxies` (geoip-lite, `country`/`ll`, `connStats`).

### Fix - Separación de permisos (admin de grupo ≠ dueño del bot)
- El rango `Admin` de `get_user_rank` proviene de `getChatAdministrators` (admin del **grupo** de Telegram), no del dueño del bot. Se han pasado a **solo Master** las acciones globales/sensibles que estaban expuestas a cualquier admin de grupo: `/gban` y `/ungban` (ban/indulto global), `/ia_programar` e `/ia_feed` (entrenan/alimentan la IA compartida) y los comandos de datos de proxies (`/estado`, `/historico`, `/pendientes`) más la aprobación de proxies.
- La moderación **del propio grupo** (`/ban`, `/unban`, `/mute`, `/unmute`, `/warn`, `/resumen`) se mantiene para admins de grupo.
- Verificado: `/listen`, `/backup_db` y `/resync` ya eran solo Master.

## [v16.83.1] - 2026-06-06
### Feature - Galería Visual de Versiones & Detección Multilingüe
- **Historial visual en Landing (`web/landing.html`)**: Maquetas interactivas y capturas de evolución de interfaz incorporadas en la landing page.
- **Detección de idioma multilingüe (`core/text_utils.py`)**: Clasificación automática de la lengua del interlocutor para adaptar respuestas de IA.
- **Pipeline de saneamiento con `ftfy`**: Integración de librería especializada para reparar cualquier desalineación de codificación UTF-8.
- **Panel de Historial Diario (`web/history.html`)**: Visor cronológico de mensajes y scripts de parsing de copias de seguridad (`scripts/parse_backups.py`).

## [v16.83.0] - 2026-05-24
### Feature - Landing page pública y panel en `/panel`
- **Landing pública en `/`**: la raíz ahora sirve una página pública de presentación de cintiabot (`web/landing.html`), sin requerir login.
- **Panel movido a `/panel`**: el dashboard (`web/index.html`) se sirve ahora en `/panel`, conservando su pantalla de login en cliente.
- **Login existente intacto**: todas las rutas `/api/*` siguen protegidas por `check_jwt` (JWT); el resto de rutas no cambia su comportamiento de acceso.
- **moon_multibot.py**: `/` apunta a `landing.html`, nueva ruta `/panel` para el panel y el catch-all `/<path:path>` se mantiene, de modo que los assets relativos del panel (`style.css`, `script.js`, fragmentos `*.html`) siguen resolviéndose desde la raíz.

## [v16.82.0] - 2026-05-16
### Feature - Google Analytics y consentimiento de cookies
- **Google Analytics 4 global**: el dashboard carga GA4 desde `GOOGLE_ANALYTICS_ID` o desde Ajustes, y registra vistas para login y cada pestaña dinámica (`/dashboard`, `/bots`, `/chat`, `/ia`, `/settings`, etc.).
- **Consentimiento de cookies**: nuevo banner responsive con aceptar/rechazar; Analytics no se carga hasta que el usuario acepta.
- **Ajustes web**: añadido panel **Analytics & Cookies** para configurar Measurement ID, activar/desactivar banner y activar/desactivar Analytics sin tocar código.
- **API pública mínima**: nuevo endpoint `/api/public/analytics` para inicializar banner y configuración antes del login sin exponer datos privados.
- **Eventos básicos**: registro opcional de consentimiento aceptado, login y logout cuando Analytics está habilitado.

## [v16.81.0] - 2026-05-11
### Fix - Polling de Telegram
- **core/telegram_api.py**: retirados `managed_bot`, `guest_message` y `guest_interaction` de `allowed_updates` para evitar que Telegram rechace `getUpdates`.
- **Respuesta del bot**: el polling vuelve a usar solo tipos oficiales de Bot API, evitando bucles de error/backoff donde el bot queda vivo en la web pero no contesta mensajes.
- **Emojis mojibake**: `_repair_mojibake()` ahora prueba `cp1252` y `latin-1`, corrigiendo mensajes como `/ayuda` que salían con `ðŸ`, `âœ` y `Ã³`.
- **Comando `/settings`**: ahora muestra la versión real del bot usando `APP_VERSION`, manteniendo Telegram y la web sincronizados.
- **Reparación mixta de mojibake**: el saneador reconstruye bytes carácter por carácter para corregir mensajes que mezclan símbolos `cp1252` y controles Latin-1, como el panel completo de `/settings`.
- **QA de comandos**: verificados 21 comandos core y 43 salidas de plugins con mocks locales; sin excepciones, sin comandos cayendo a IA por error y sin marcadores mojibake tras saneado.

## [v16.80.0] - 2026-05-11
### Fix — Comandos core y plugins más fiables
- **moon_multibot.py**: nuevo normalizador de comandos para soportar /comando@BotName también en plugins.
- **Pipeline de plugins**: centralizado en _run_plugin_command() para evitar duplicación y errores silenciosos.
- **Compatibilidad de plugins**: MoonBot expone db e ia_nativa para plugins que ya dependían de esos atributos.
- **Permisos de plugins**: normalizada la comparación de rangos para aceptar Admin/Master sin romper plugins que esperaban minúsculas.
## [v16.79.0] - 2026-05-11
### Fix — Emojis y texto corrupto (mojibake) en mensajes del bot
- **moon_multibot.py**: nuevo helper _repair_mojibake(text) para reparar cadenas UTF-8 mal decodificadas (patrones como ðŸ, Ã, â, Â).
- **Hotfix global en send_msg()**: todo texto saliente se sanea antes de enviar por Bot API/TDLib.
- **Historial interno**: ahora persiste el texto saneado para evitar arrastrar corrupción visual en dashboard.
## [v16.78.0] - 2026-05-11
### Fix — Pipeline de comandos y estabilidad de plugins
- **moon_multibot.py**: corregido el flujo de comandos para ejecutar en orden core -> plugins, evitando que comandos de plugins queden saltados por un continue prematuro.
- **Comandos no reconocidos**: ahora devuelven respuesta explícita (Usa /ayuda o /helpplus) y nunca caen al motor IA.
- **Bloque duplicado de comandos**: eliminado un tramo redundante en el loop principal de mensajes.
- **plugins/__init__.py**: normalizado a UTF-8 para eliminar bytes nulos que rompían compilación global.
## [v16.77.0] - 2026-05-08
### Fix — Mensaje de LEVEL UP con texto raro al lado
- **moon_multibot.py**: saneado de uname en el mensaje de subida de nivel para escapar caracteres conflictivos de Markdown.
- **Mensaje de level up** ajustado para formato estable y limpio: evita artefactos visuales cuando el nombre contiene símbolos especiales.
## [v16.76.0] - 2026-05-08
### Modularización core — más rutas fuera de moon_multibot.py
- **core/routes_ia.py**: extraído el bloque /api/ia/* completo (traducción, stats, feeders, auditorías, config, backup/restore, test), además de /api/global/history y /api/admin/settings.
- **core/routes_admin.py**: extraídas rutas /api/admin/* (broadcast, maintenance, shield, backup).
- **core/routes_system.py**: extraídas rutas /api/telegram/call y /api/reboot.
- **core/routes_users.py**: extraídas rutas /api/media, /api/ping, /api/stats/users, /api/stats/heatmap y bloque /api/users/* (ban/unban/listado/historial/notas).
- **core/routes_ops.py**: extraídas rutas de operación /api/audit, /api/logs/download y /api/automation/faq*.
- **Registro por blueprints**: todas las rutas nuevas conectadas con patrón setup(deps) -> Blueprint, usando inyección de dependencias y getters/lambdas para estado runtime.
- **moon_multibot.py**: reducido de forma incremental al retirar múltiples endpoints del monolito sin cambiar contratos de API.
## [v16.75.0] - 2026-05-08
### Fix â€” Error 400 "can't parse entities" en sendMessage
- **`_safe_md(text)`**: nuevo helper en `invoked_ai.py` que elimina marcadores Markdown impares (`*`, `_`, `` ` ``) del texto de la IA antes de enviarlo, previniendo el error en origen.
- **`send_msg()`**: si Telegram devuelve `"can't parse entities"`, reintenta automÃ¡ticamente sin `parse_mode` en lugar de perder el mensaje.

## [v16.74.0] - 2026-05-08
### Fix â€” Modo Markov (Personal) no aparecÃ­a en estadÃ­sticas
- **`invoked_ai.py`**: `"markov"` no estaba en la lista de valores vÃ¡lidos de `ai_used` en `generate_reply()` â€” se contabilizaba errÃ³neamente como `"hybrid"`.
- **`_record_ai_usage()`**: aÃ±adido contador `markov_count` con su propia rama `elif`. Antes caÃ­a al `else` de hybrid.
- **`get_ai_statistics()`**: `markov` incluido en `ai_distribution` devuelto por la API.
- **`ia.html`**: nueva fila "ðŸ§  Markov (Personal)" (en morado) en el panel DistribuciÃ³n IA.
- **`script.js`**: `inlineDistMarkov` actualizado al cargar las estadÃ­sticas.

## [v16.73.0] - 2026-05-08
### Perf â€” Circuit breaker + timeout split para Ollama
- **Timeout separado** `(connect=3s, read=30s)`: si Ollama no responde en 3s falla inmediatamente en lugar de esperar 30s, sin penalizar inferencias legÃ­timamente lentas.
- **Circuit breaker** (`_ollama_last_fail` + `_ollama_fail_cooldown=60s`): tras un fallo no reintenta durante 60 segundos, eliminando la acumulaciÃ³n de timeouts en el tiempo promedio.
- **`requests.Session` reutilizable** (`_ollama_session`): keep-alive y connection pooling eliminan el overhead de abrir nueva conexiÃ³n TCP en cada llamada.
- `deep_dream_worker` tambiÃ©n usa la sesiÃ³n y respeta el circuit breaker.

## [v16.72.0] - 2026-05-08
### Fix â€” Modo SueÃ±o Profundo se activaba al iniciar y panel no visible
- **Bug de auto-activaciÃ³n**: el bloque `elif word:` llamaba a Wikipedia en cada ciclo aunque `DEEP_DREAM_MODE = False`. Todo el aprendizaje ahora estÃ¡ dentro de `if DEEP_DREAM_MODE and word:`.
- **Visibilidad**: panel movido justo debajo de la secciÃ³n Ollama (era el panel nÂº8, muy abajo). DescripciÃ³n actualizada: "Debe activarse manualmente."

## [v16.70.0] - 2026-05-08
### ModularizaciÃ³n â€” 6 Blueprints Flask extraÃ­dos
- **`core/routes_business.py`**: `/api/business/*` (3 rutas â€” status, config, quick_replies).
- **`core/routes_proxies.py`**: `/api/proxies/*` (7 rutas â€” stats, vps config, vps stats, add, toggle, remove, scan).
- **`core/routes_tdlib.py`**: `/api/tdlib/*` (4 rutas â€” status, auth, userbot, sync).
- **`core/routes_security.py`**: `/api/security/*`, `/api/vision/stats`, `/api/health/telegram` (8 rutas).
- **`core/routes_queue.py`**: `/api/queue/*` (3 rutas â€” list, cancel, prioritize).
- **`core/routes_moderation.py`**: `/api/moderation/*`, `/api/users/leaderboard` (10 rutas).
- **PatrÃ³n `setup(deps) â†’ Blueprint`**: sin imports circulares; dependencias inyectadas al registrar. `proxy_bot` usa getter lambda por ser asignaciÃ³n tardÃ­a.
- **`moon_multibot.py`**: reducido de 4945 a 4645 lÃ­neas (âˆ’300).

## [v16.69.0] - 2026-05-08
### Fix web â€” backupIA, restoreIA y toggleJoinDelete duplicado
- **`backupIA()`**: nuevo endpoint `GET /api/ia/download` que sirve la DB como descarga directa con token en query param. La funciÃ³n JS usa `<a href>` con el token para disparar la descarga.
- **`restoreIA()`**: nuevo endpoint `POST /api/ia/restore` que acepta un `.db`, hace backup previo automÃ¡tico (`moon_database.db.pre_restore`) y reemplaza la DB activa.
- **`send_file`** aÃ±adido a los imports de Flask en `moon_multibot.py`.
- **`toggleJoinDelete()` duplicado eliminado**: la segunda definiciÃ³n (stub que solo mostraba un toast) sobreescribÃ­a la implementaciÃ³n real. Eliminada la duplicada; la real (toggle ON/OFF con feedback visual) queda intacta.

## [v16.68.0] - 2026-05-08
### Panel dedicado â€” Modo SueÃ±o Profundo
- **Panel propio en pestaÃ±a IA**: el toggle de SueÃ±o Profundo sale del panel "Ajustes del Cerebro HÃ­brido" y tiene su propia tarjeta con borde morado, tÃ­tulo `h3` visible e interruptor escalado al 120%.
- **Indicador de estado en tiempo real**: punto que pulsa en morado con glow cuando estÃ¡ activo; gris cuando estÃ¡ inactivo. Texto descriptivo que cambia al activar/desactivar.
- **`toggleDeepDream(active)`**: nueva funciÃ³n JS que actualiza la UI inmediatamente, guarda la config y muestra un toast de confirmaciÃ³n.
- **`_applyDeepDreamUI(active)`**: funciÃ³n auxiliar que sincroniza el punto, el texto y el fondo del panel. Se llama tambiÃ©n al cargar la config inicial (`loadIAConfig`).

## [v16.67.0] - 2026-05-08
### Markov â€” autoentrenamiento con Wikipedia
- **Root cause corregido**: `initial_knowledge.json` contiene palabras sueltas que nunca crean bigramas en `learn()`. El cerebro tenÃ­a vocabulario pero cero conexiones reales.
- **`_seed_from_wikipedia(topics)`**: nuevo mÃ©todo que busca el resumen de Wikipedia (ES â†’ EN fallback) para cada topic y llama a `learn()` con oraciones completas, creando bigramas reales.
- **`seed_knowledge()`**: ya no llama a `learn()` con palabras sueltas; llama a `_seed_from_wikipedia()` sobre los topics de `initial_knowledge.json` (mÃ¡x 40 topics por arranque).
- **`_deep_dream_wikipedia(word)`**: nuevo helper que busca una palabra en Wikipedia y aprende el extracto. Usado como fallback cuando Ollama no estÃ¡ disponible.
- **`deep_dream_worker` refactorizado**: si Ollama falla o no estÃ¡ configurado, usa `_deep_dream_wikipedia()` en cada ciclo. El auto-estudio ya no depende de Ollama.
- **Persistencia mÃ¡s frecuente**: `_learn_count % 5` â†’ `% 2`; el cerebro se guarda en DB tras cada 2 aprendizajes.
- **Umbral de re-sembrado**: `< 1000` â†’ `< 5000` keywords para activar `seed_knowledge()` al arrancar.

## [v16.63.0] - 2026-05-08
### IA â€” cascada Markov â†’ Ollama â†’ Gemini
- **Prioridad definida**: 1) Markov (siempre se genera, local, instantÃ¡neo) â†’ 2) Ollama (si estÃ¡ activo y responde) â†’ 3) Gemini (si Ollama falla y hay API key).
- **MÃ©todos extraÃ­dos**: `_call_ollama()` y `_call_gemini()` separados del `generate()` principal, con logging explÃ­cito de cuÃ¡l IA respondiÃ³.
- **Fix bug Markov**: la selecciÃ³n ponderada acumulaba `upto` despuÃ©s de la comparaciÃ³n, haciendo que siempre eligiera `choices[0]`. Corregido: `upto += w` antes del `if upto >= r_val`.
- **`/markov` prefix**: en inline/guest, `/markov` fuerza la IA local sin llamar a ningÃºn LLM externo.
- **`LLM_PROVIDER` default**: cambiado de `"gemini"` a `"ollama"` en `core/config.py` para que activar `USE_EXTERNAL_LLM` use Ollama por defecto.
- **Fallback visible**: cada capa loguea en el dashboard quÃ© IA respondiÃ³ o por quÃ© se saltÃ³ a la siguiente.

## [v16.61.0] - 2026-05-08
### Fix IA local â€” brain_lock y deep_dream
- **`brain_lock` activado en `learn()`**: el bloqueo existÃ­a pero nunca se adquirÃ­a. Ahora protege las actualizaciones concurrentes del cerebro Markov.
- **Fix crÃ­tico en `deep_dream_worker`**: `brain.keys()` devolvÃ­a `["keywords","patterns"]` en lugar de las palabras reales. Corregido a `brain["keywords"].keys()`.
- **Backoff en deep_dream**: si Ollama no estÃ¡ disponible, el worker retrocede exponencialmente (60s â†’ 120s â†’ 240s â†’ mÃ¡x 600s) en lugar de reintentar inmediatamente.

## [v16.60.0] - 2026-05-08
### Wikipedia en modo Inline y Guest
- **`_search_wikipedia(query)`**: busca en Wikipedia en espaÃ±ol (fallback a inglÃ©s). Usa la API REST de Wikipedia con timeout de 4s para no bloquear la respuesta.
- **Prompt enriquecido**: el contexto de Wikipedia se inyecta en el prompt de la IA para que la respuesta sea mÃ¡s precisa y factual.
- **Resultado extra en Inline**: si hay resultado de Wikipedia, aparece como opciÃ³n "ðŸ“– Wikipedia" adicional junto a "ðŸ¤– Respuesta IA" y "âœ‚ï¸ Respuesta breve".
- **Guest mode**: Wikipedia tambiÃ©n enriquece las respuestas en chats donde el bot es invitado.

## [v16.58.0] - 2026-05-08
### Resiliencia â€” backoff en getUpdates + aislamiento de plugins
- **Exponential backoff en `run()`**: fallos consecutivos en getUpdates esperan 5s, 10s, 20s, 40sâ€¦ hasta 300s. El contador se resetea en cada respuesta exitosa.
- **Aislamiento de errores en plugins**: `handle_command()` ahora estÃ¡ envuelto en try-except igual que `handle_callback()`. Un plugin con bug ya no crashea el loop de mensajes; el error se loguea en el dashboard.

## [v16.57.0] - 2026-05-08
### Retry + rate limit 429 en telegram_api_call
- **Retry automÃ¡tico**: hasta 3 intentos con backoff exponencial (1s, 2s) en errores de red (`ConnectionError`, `Timeout`).
- **Manejo de 429**: cuando Telegram devuelve `error_code: 429`, espera `retry_after` segundos (del parÃ¡metro de respuesta) y reintenta automÃ¡ticamente.
- Sin cambios en la firma pÃºblica; el comportamiento es transparente para el resto del cÃ³digo.

## [v16.55.0] - 2026-05-08
### CI â€” Lint automÃ¡tico en cada push
- **`.github/workflows/ci.yml`**: workflow que ejecuta `ruff` sobre todo el cÃ³digo Python en cada push a master o PR. Detecta errores de sintaxis, variables no definidas e imports rotos. Ignora lÃ­neas largas (E501) e imports al estilo del proyecto.

## [v16.54.0] - 2026-05-08
### Limpieza automÃ¡tica de descargas
- **`cleanup_worker()`**: hilo daemon que llama a `purge_old_media()` en cada bot activo una vez al dÃ­a. Lee `auto_cleanup_days` de `GLOBAL_SETTINGS`; si es 0 estÃ¡ desactivado.
- **Selector en Settings**: dropdown "Limpieza AutomÃ¡tica de Descargas" con opciones: Desactivado / 1 dÃ­a / 3 dÃ­as / 7 dÃ­as / 30 dÃ­as.
- Previene que la carpeta `downloads/` llene el disco en producciÃ³n.

## [v16.53.0] - 2026-05-08
### .dockerignore â€” build context reducido
- **`.dockerignore`**: excluye `.git/`, `data/`, `downloads/`, `ollama_data/`, `__pycache__/`, `logs/`, `scratch/` y otros archivos que no deben entrar a la imagen Docker. El contexto de build baja de ~43MB a ~3MB, acelerando todos los futuros builds.
- `libtdjson.so` NO estÃ¡ excluido para que `setup_tdlib.sh` pueda copiarlo al contexto.

## [v16.52.0] - 2026-05-08
### TDLib â€” detecciÃ³n dual: binario local o GitHub Release
- **`setup_tdlib.sh`**: script que busca `libtdjson.so` en rutas conocidas del servidor (`/usr/local/lib/`, `~/td/`, `/tmp/td/`, `/opt/td/`). Si lo encuentra, lo copia al directorio del proyecto para que el Dockerfile lo use directamente, evitando la descarga desde GitHub.
- **`Dockerfile` con fallback inteligente**: tras `COPY . .`, comprueba si `libtdjson.so` estÃ¡ presente en el contexto de build. Si estÃ¡ â†’ lo mueve a `/usr/local/lib/`. Si no â†’ descarga desde el GitHub Release. Un solo Dockerfile soporta ambos escenarios.
- **`.gitignore`**: `libtdjson.so` ignorado para que el binario local nunca se comitee al repositorio.
- **Flujo recomendado en el servidor**: `./setup_tdlib.sh && docker compose up -d --build`. Si el binario local existe, el build no accede a GitHub en absoluto.

## [v16.51.0] - 2026-05-08
### TDLib pre-compilado â€” descarga directa desde GitHub Release
- **`Dockerfile` sin compilaciÃ³n**: etapa Ãºnica `python:3.12-slim`. Descarga `libtdjson.so` del Release de GitHub con `curl` en ~2 segundos. Build total pasa de ~15 min a ~1 min.
- **`.github/workflows/build-tdlib-binary.yml`**: workflow que compila TDLib en `ubuntu-22.04`, sube `libtdjson.so` al release `tdlib-prebuilt` del repo. Se lanza manualmente (`workflow_dispatch`) o al editar el propio workflow. Registra el commit hash de TDLib en la descripciÃ³n del release.
- **Para actualizar TDLib**: ir a Actions â†’ "Compile & publish libtdjson.so" â†’ Run workflow. El siguiente `docker compose up --build` descarga el binario nuevo automÃ¡ticamente.

## [v16.50.0] - 2026-05-08
### TDLib pre-compilado en GHCR â€” builds en segundos
- **`Dockerfile.tdlib`**: imagen base standalone que compila TDLib desde fuente y guarda `libtdjson.so`. Se construye una sola vez y se publica en `ghcr.io/comunidadtelebots/moon-multibot-tdlib:latest`.
- **`.github/workflows/build-tdlib-base.yml`**: GitHub Actions que construye y publica la imagen base automÃ¡ticamente cuando cambia `Dockerfile.tdlib`, o bajo demanda con `workflow_dispatch`. Usa cachÃ© de GHA para acelerar incluso la compilaciÃ³n inicial.
- **`Dockerfile` refactorizado**: la etapa 1 pasa de compilar (~15 min) a `FROM ghcr.io/â€¦/moon-multibot-tdlib:latest AS tdlib-builder` (descarga en segundos). El `ARG TDLIB_IMAGE` permite sobrescribir la imagen base si es necesario.
- **`docker-compose.yml`**: pasa `TDLIB_IMAGE` como build arg y aÃ±ade `cache_from` apuntando a la imagen GHCR para que Docker reutilice capas cacheadas.
- **Flujo para actualizar TDLib**: lanzar manualmente el workflow â†’ GHCR actualiza la base â†’ el siguiente `docker compose up --build` en el servidor la descarga automÃ¡ticamente.

## [v16.50.0] - 2026-05-08
### Backup automÃ¡tico programado
- **`auto_backup_worker()`**: hilo daemon que envÃ­a la DB al Master cada N horas. Lee `GLOBAL_SETTINGS.auto_backup_hours`; si es 0 estÃ¡ desactivado. Persiste `LAST_AUTO_BACKUP` en SQLite para no enviar duplicados al reiniciar.
- **Selector en Settings**: dropdown "Backup AutomÃ¡tico" con opciones: Desactivado / 6h / 12h / 24h / 48h. Se guarda y carga con el resto de `GLOBAL_SETTINGS`.
- El mensaje incluye fecha, hora y tamaÃ±o en MB de la DB enviada.

## [v16.49.0] - 2026-05-08
### Panel TDLib en el Dashboard (tab DiagnÃ³stico)
- **Panel visual TDLib** en `diagnostics.html`: muestra modo (user/bot), estado de auth, si estÃ¡ listo y si el userbot estÃ¡ activo.
- **AutenticaciÃ³n headless desde la UI**: campos para telÃ©fono, cÃ³digo y contraseÃ±a 2FA con botones individuales que llaman a `POST /api/tdlib/auth`.
- **Toggle userbot**: botÃ³n que invierte el estado actual con `GET + POST /api/tdlib/userbot`.
- **SincronizaciÃ³n de historial**: input de chat_id + botÃ³n que llama a `POST /api/tdlib/sync`.
- **`refreshTDLib()`**: funciÃ³n JS que actualiza el panel; se llama automÃ¡ticamente al abrir la tab de DiagnÃ³stico (`runDiagnostics`).

## [v16.48.0] - 2026-05-08
### Docker HEALTHCHECK y endpoint /health
- **`HEALTHCHECK`** en Dockerfile: `--interval=30s --timeout=10s --start-period=90s --retries=3`. Docker marca el contenedor como `unhealthy` si `/health` no responde 3 veces, habilitando reinicio automÃ¡tico con `restart: unless-stopped`.
- **`GET /health`** (sin auth): endpoint pÃºblico que devuelve `{"ok": true, "uptime": N, "bots": N}`. No expone datos sensibles pero permite que Docker y load balancers verifiquen el estado del proceso.

## [v16.47.0] - 2026-05-08
### SQLite WAL mode y conexiÃ³n por hilo
- **WAL (Write-Ahead Logging)**: `PRAGMA journal_mode=WAL` elimina el lock exclusivo de escritura. MÃºltiples hilos pueden leer simultÃ¡neamente mientras se escribe, reduciendo contenciÃ³n entre el bot, TDLib, telemetry y daily report.
- **`PRAGMA synchronous=NORMAL`**: equilibrio entre rendimiento y durabilidad (mucho mÃ¡s rÃ¡pido que FULL sin sacrificar integridad en caÃ­das normales).
- **ConexiÃ³n por hilo (`threading.local`)**: cada hilo mantiene su propia conexiÃ³n SQLite, eliminando el cursor compartido que podÃ­a corromperse bajo concurrencia alta.
- **`db.delete(key)`**: nuevo mÃ©todo para eliminar claves individuales (usado por `_invalidate_admin_cache`).

## [v16.46.0] - 2026-05-08
### TDLib auto-reconexiÃ³n con backoff exponencial
- **`_watchdog()`**: hilo daemon que monitoriza `_running` cada 60 s. Si el cliente TDLib cae (`authorizationStateClosed` u otro error), espera un backoff exponencial (30 s Ã— 2^n, mÃ¡x 5 min), crea un nuevo `client_id` y relanza el `_receive_loop`. El contador `_restart_count` evita reintentos infinitos instantÃ¡neos.
- Backoff: intento 1 â†’ 30 s, intento 2 â†’ 60 s, intento 3 â†’ 120 s, intento 4 â†’ 240 s, intento 5+ â†’ 300 s.
- Funciona para el cliente usuario y para cada bot con token propio.

## [v16.45.0] - 2026-05-08
### Callback queries, reacciones e invalidaciÃ³n de cachÃ© de admins
- **`handle_callback_query(update)`**: nuevo handler en el dispatch loop. Extrae `callback_query`, delega a plugins que implementen `handle_callback(bot, cid, uid, uname, data, cbq_id)`, y siempre llama `answerCallbackQuery` para detener el spinner de Telegram. Updates no manejados se loguean como DEBUG.
- **`handle_message_reaction(update)`**: procesa `message_reaction` y `message_reaction_count` (antes descartados sin routing). Registra quÃ© emoji pusÃ³ cada usuario en cada mensaje.
- **Routing en `run()`**: `callback_query` â†’ `handle_callback_query`, `message_reaction` â†’ `handle_message_reaction`, `message_reaction_count` â†’ skip limpio.
- **`_invalidate_admin_cache(cid)`**: helper que borra `ADMINS_{cid}` y resetea `LAST_ADMIN_CHECK_{cid}`. Se llama automÃ¡ticamente en `kick_user()` y `promote_user()` para que el nuevo rango sea efectivo inmediatamente sin esperar los 5 minutos de cachÃ©.

## [v16.44.0] - 2026-05-08
### Bot API 10.0 â€” nuevos mÃ©todos y actualizaciÃ³n de versiÃ³n
- **VersiÃ³n API**: `TELEGRAM_BOT_API_VERSION` actualizada de `9.6` a `10.0`.
- **Nuevos update types**: `message_reaction` y `message_reaction_count` aÃ±adidos a `DEFAULT_ALLOWED_UPDATES`.
- **`unpin_msg(cid, mid=None)`** (fix crÃ­tico): mÃ©todo faltante que era llamado en `plugins/telegram_tools.py` â€” ahora definido; sin `mid` desancla el Ãºltimo mensaje.
- **`unpin_all_messages(cid)`**: llama a `unpinAllChatMessages`.
- **`unban_chat_member(cid, uid)`**: llama a `unbanChatMember` con `only_if_banned=True`.
- **`send_chat_action(cid, action)`**: indicador de escritura/carga (`typing`, `upload_photo`, etc.).
- **`send_voice(cid, voice, caption="")`**: envÃ­o de notas de voz.
- **`send_sticker(cid, sticker)`**: envÃ­o de stickers.
- **`forward_message(to_cid, from_cid, mid)`**: reenvÃ­a un mensaje.
- **`copy_message(to_cid, from_cid, mid, caption)`**: copia un mensaje (sin el "Forwarded from").
- **`get_chat(cid)`**: info del chat/grupo.
- **`get_chat_member_count(cid)`**: nÃºmero de miembros.
- **`answer_callback_query(cbq_id, text, show_alert, url, cache_time)`**: respuesta a botones inline.
- **`set_message_reaction(cid, mid, reaction, is_big)`**: pone reacciÃ³n emoji en un mensaje.
- **API 9.5 â€” `set_chat_member_tag(cid, uid, tag)`**: etiqueta personalizada para miembro.
- **API 9.6 â€” `save_prepared_keyboard_button(button, query_id)`**: botÃ³n de teclado preparado para bots administrados.
- **API 10.0 â€” `answer_guest_query(guest_query_id, text, show_alert)`**: respuesta a guest queries.
- **API 10.0 â€” `delete_message_reaction(cid, mid, reaction_type)`**: elimina reacciÃ³n especÃ­fica.
- **API 10.0 â€” `delete_all_message_reactions(cid, mid)`**: elimina todas las reacciones de un mensaje.
- **API 10.0 â€” `send_live_photo(cid, live_photo, caption)`**: envÃ­a una live photo.
- **API 10.0 â€” `get_managed_bot_access_settings(bot_id)`** / **`set_managed_bot_access_settings(bot_id, **kwargs)`**: configuraciÃ³n de acceso de bots administrados.
- **API 10.0 â€” `get_user_personal_chat_messages(user_id, limit)`**: mensajes del chat personal de un usuario.

## [v16.43.0] - 2026-05-08
### MoonBot envÃ­a mensajes via TDLib (bot token auth)
- **TDLib bot auth**: `TDLibClient` acepta `bot_token` opcional. Cuando estÃ¡ presente, al recibir `authorizationStateWaitPhoneNumber` envÃ­a `checkAuthenticationBotToken` en vez de esperar telÃ©fono. Cada bot tiene su propia sesiÃ³n en `tdlib_data/bot_{hash}/`.
- **Cliente TDLib por instancia de bot**: `MoonBot.__init__` crea un `TDLibClient` autenticado con su token si `TDLIB_API_ID`/`TDLIB_API_HASH` estÃ¡n configurados. Se inicia en background automÃ¡ticamente.
- **`MoonBot.send_msg()` con TDLib + fallback**: Si `self._tdlib.is_ready`, el mensaje se envÃ­a via TDLib (`sendMessage` + `inputMessageText` con parse_mode via `parseTextEntities`). Si TDLib no estÃ¡ listo o falla, cae automÃ¡ticamente al Bot API HTTP. Los mensajes de business connection siempre usan Bot API (TDLib no los soporta).
- **`TDLibClient._format_text()`**: convierte texto Markdown/HTML al `formattedText` de TDLib usando `parseTextEntities` (llamada sÃ­ncrona `execute`).
- **`TDLibClient.is_ready`**: propiedad que expone `auth_state == authorizationStateReady`.
- **Dockerfile**: aÃ±adido `DEBIAN_FRONTEND=noninteractive` para evitar prompts interactivos durante la compilaciÃ³n de TDLib en Docker.

## [v16.42.0] - 2026-05-07
### TDLib Userbot â€” responder mensajes via cuenta de usuario
- **Modo userbot activable desde dashboard**: `POST /api/tdlib/userbot {"enabled": true/false}`. El estado se persiste en SQLite (`TDLIB_USERBOT_ENABLED`).
- **`TDLibClient.send_message(chat_id, text, reply_to_message_id)`**: envÃ­a mensajes via TDLib con `sendMessage` + `inputMessageText`. Soporta respuesta a mensaje especÃ­fico.
- **`TDLibClient.on_message` callback**: el loop receptor llama a `_handle_new_message()` en cada `updateNewMessage`. Normaliza el mensaje TDLib al formato interno y llama al handler registrado. Ignora mensajes propios (`is_outgoing`).
- **Handler `_tdlib_on_message()` en moon_multibot.py**: procesa mensajes recibidos vÃ­a TDLib. En grupos solo responde si hay menciÃ³n directa, comando `/` o respuesta a nuestro mensaje. En DMs responde a todo. Usa `ia_nativa.generate()` + `ia_nativa.learn()` igual que `MoonBot`. Persiste mensajes y respuestas en `CHAT_HIST_{cid}`.
- **Comandos userbot**: `/start`, `/help` y `/tdstatus` disponibles via TDLib.
- **`TDLibClient._fetch_me()`**: obtiene el propio `user_id` y `username` tras autenticar para detectar menciones correctamente.
- **`GET /api/tdlib/userbot`**: devuelve estado actual y datos del usuario autenticado (`me`).

## [v16.41.0] - 2026-05-07
### IntegraciÃ³n TDLib directa vÃ­a ctypes (MTProto completo)
- **`core/tdlib_client.py`** (180 lÃ­neas): Wrapper Python puro sobre `libtdjson.so` usando `ctypes`. Sin librerÃ­a intermedia â€” carga el binario compilado directamente con `CDLL`. Expone `get_history()`, `sync_to_db()` y mÃ¡quina de estados de autenticaciÃ³n headless.
- **`Dockerfile` multi-stage**: Etapa 1 compila TDLib desde fuente en Ubuntu 22.04 con `clang-14` y `libc++`. Etapa 2 copia solo `libtdjson.so` (~8 MB) al contenedor `python:3.12-slim`. El binario se cachea en capas Docker â€” sÃ³lo recompila si cambia TDLib.
- **AutenticaciÃ³n headless via dashboard**: `auth_state` expuesto en `/api/tdlib/status`. El flujo telÃ©fono â†’ cÃ³digo â†’ contraseÃ±a se completa con `POST /api/tdlib/auth` (`action`: `phone`/`code`/`password`). Sin `input()` bloqueante â€” compatible con Docker.
- **SincronizaciÃ³n de historial**: `POST /api/tdlib/sync` con `chat_id` importa hasta 200 mensajes del servidor Telegram directamente a `CHAT_HIST_{cid}` en SQLite, deduplicando por `(time, uid, text[:20])`.
- **Variables de entorno**: `TDLIB_API_ID` y `TDLIB_API_HASH` (obtenidos en my.telegram.org). Si no estÃ¡n definidas, TDLib queda deshabilitado sin error â€” el bot funciona igual con solo Bot API.
- **Inicio automÃ¡tico**: Si las variables estÃ¡n presentes, `tdlib_client.start()` arranca el hilo receptor al iniciar el bot y conecta el logger con `tdlib_client._log = add_web_log`.

## [FUTURO] - IntegraciÃ³n TDLib (MTProto completo)
### Objetivo: reemplazar/complementar Bot API con TDLib para acceso completo a Telegram
- **TDLib como cliente MTProto**: Integrar [TDLib](https://core.telegram.org/tdlib) vÃ­a `python-tdlib` o `pytdlib` para acceder a la API completa de Telegram con una cuenta de usuario, sin las restricciones del Bot API.
- **RecuperaciÃ³n de historial completo**: Con TDLib se podrÃ¡n cargar todos los mensajes histÃ³ricos de cualquier grupo/canal al que pertenezca la cuenta, no solo los recibidos desde que el bot estÃ¡ corriendo. Importarlos a `CHAT_HIST_{cid}` en SQLite.
- **SincronizaciÃ³n en tiempo real**: TDLib mantiene una base de datos local cifrada (`tdlib_db/`) con el estado completo de chats, listas de miembros y metadatos â€” sin depender de reintentos al Bot API.
- **Acceso a funciones exclusivas de usuario**: Reacciones, historias, chats de voz, descarga de medios grandes, gestiÃ³n de supergrupos sin restricciones de Bot API.
- **MÃ³dulo propuesto**: `core/tdlib_client.py` â€” wrapper que expone `get_history(chat_id, limit)`, `send_message(chat_id, text)` y `sync_to_db()`. Se instancia con `api_id`, `api_hash` y nÃºmero de telÃ©fono de la cuenta de usuario.
- **Dependencias**: `python-tdlib` (o compilar TDLib nativo + ctypes wrapper), `api_id`/`api_hash` desde [my.telegram.org](https://my.telegram.org).
- **Nota**: Requiere cuenta de usuario Telegram (no un token de bot). Puede coexistir con el Bot API actual: el bot sigue respondiendo mensajes, TDLib se usa solo para lectura/historial.

## [v16.40.0] - 2026-05-07
### ModularizaciÃ³n: ProxyManager, VirusTotalManager y TaskQueue
- **`core/proxy_manager.py`**: Extrae la clase `ProxyManager` (~220 lÃ­neas). Constructor recibe `db` y `log_func` inyectados; elimina dependencia directa con el estado global de `moon_multibot.py`.
- **`core/vt_manager.py`**: Extrae `VirusTotalManager` (30 lÃ­neas). Clase autocontenida que solo necesita `requests`; se instancia con la API key directamente.
- **`core/task_queue.py`**: Extrae `TaskQueue` (60 lÃ­neas). Recibe `log_func` opcional; usa no-op hasta que `add_web_log` estÃ¡ disponible y se conecta a posteriori con `task_queue._log = add_web_log`.
- **`moon_multibot.py` reducido de 4794 â†’ 4497 lÃ­neas** (âˆ’297 lÃ­neas / âˆ’6%). El archivo principal ahora solo contiene `MoonCoreIA` y `MoonBot` como clases definidas localmente.
- **InyecciÃ³n de dependencias**: `proxy_mgr = ProxyManager(db)` en vez de acceder al global directamente. El logger se conecta con `proxy_mgr._log = add_web_log` despuÃ©s de que `add_web_log` estÃ© definido.

## [v16.39.0] - 2026-05-07
### Persistencia del Historial de Chat
- **Historial persistente en SQLite**: Los mensajes del chat (usuarios y bot) ahora se guardan en la base de datos con la clave `CHAT_HIST_{cid}`. El historial sobrevive reinicios del bot; antes se perdÃ­a al reiniciar porque solo existÃ­a en memoria.
- **Helper `_append_chat_hist()`**: FunciÃ³n centralizada que aÃ±ade cada mensaje al dict en memoria, recorta a los Ãºltimos 200 por chat y persiste en SQLite automÃ¡ticamente. Usada tanto en el loop de mensajes entrantes como en `send_msg()`.
- **Carga lazy desde DB**: Al seleccionar un chat en el dashboard, si la memoria no tiene historial (primer arranque tras reinicio), se recupera automÃ¡ticamente desde `CHAT_HIST_{cid}` sin necesidad de reiniciar.
- **Cap de 200 mensajes por chat**: El historial almacenado en DB se limita a los Ãºltimos 200 mensajes para evitar crecimiento ilimitado en SQLite. El dashboard sigue mostrando los Ãºltimos 100.

## [v16.38.0] - 2026-05-07
### Fix Chat Dashboard: Mensajes Bot, Scroll y Encoding
- **Respuestas del bot visibles en el chat**: `send_msg()` ahora registra el mensaje enviado en `global_chat_history` cuando el chat ya tiene historial activo. Antes solo aparecÃ­an los mensajes de los usuarios; ahora se ve la conversaciÃ³n completa (bot + usuarios).
- **ProtecciÃ³n contra historial vacÃ­o en JS**: `fetchChatHistory()` usa `data.history || []` para no explotar si la API devuelve error o historial nulo. Se muestra estado vacÃ­o "Sin mensajes registrados" en lugar de dejar la pantalla en blanco.
- **Scroll correcto en el Ã¡rea de mensajes**: AÃ±adido `min-height: 0` a `.chat-messages` y `.chat-main` en el CSS. Sin esta propiedad, los elementos `flex-grow: 1` dentro de un contenedor flex-column no activan `overflow-y: auto` y el scroll no funciona.
- **Error silencioso en fetch**: AÃ±adido `.catch(() => {})` en `fetchChatHistory()` para evitar errores no capturados en la consola por fallos de red o auth expirado.
- **ReparaciÃ³n de encoding mojibake en `script.js`**: 67 segmentos de emojis y texto en espaÃ±ol estaban double-encoded (bytes UTF-8 interpretados como cp1252/Latin-1 y re-guardados como Unicode). Reparados con un algoritmo de reverse cp1252 que convierte secuencias como `Ã¢\x9dÅ’` â†’ `âŒ` y `Ã°Å¸Å’â„¢` â†’ `ðŸŒ™` sin tocar el texto ASCII ni los caracteres ya correctos.

## [v16.37.0] - 2026-05-07
### CorrecciÃ³n CrÃ­tica Ollama y SelecciÃ³n de Motor IA
- **Fix crÃ­tico `ai_preference`**: `MoonCoreIA.generate()` no aceptaba el parÃ¡metro `ai_preference` que `InvokedAIService` intentaba pasarle, provocando un `TypeError` silencioso en cada consulta Inline y Guest. El parÃ¡metro ya estÃ¡ declarado correctamente.
- **Enrutamiento por motor implementado**: Al forzar `/ollama` o `/gemini` en un query, el motor seleccionado se usa directamente ignorando el ratio hÃ­brido global (`HYBRID_PERCENTAGE`). El modo `hybrid` o sin prefijo sigue respetando la configuraciÃ³n global.
- **Variable `effective_provider`**: Toda la lÃ³gica de llamada a LLM usa ahora `effective_provider` en lugar de `LLM_PROVIDER` directo, permitiendo overrides por peticiÃ³n sin alterar el estado global.
- **JSON seguro en respuestas Ollama y Gemini**: AÃ±adido `try/except` especÃ­fico para `ValueError`/`KeyError`/`IndexError` al parsear las respuestas de ambos motores. Errores de JSON malformado ya no colapsan el hilo y quedan registrados en el log.
- **Fallback de compatibilidad en `invoked_ai`**: Si `generate()` lanza `TypeError` (versiÃ³n antigua del core sin `ai_preference`), el servicio reintenta sin el parÃ¡metro y registra `hybrid` como motor usado.

## [v16.36.0] - 2026-05-07
### Panel Dashboard EstadÃ­sticas Inline y Guest IA
- **IntegraciÃ³n dashboard estadÃ­sticas**: Nuevo panel en la pestaÃ±a IA con tarjetas de resumen (total solicitudes, tasa de Ã©xito, tiempo promedio), desglose Inline/Guest, distribuciÃ³n por motor y feed de los Ãºltimos 20 eventos con tiempo de respuesta y usuario.
- **Selector de motor por defecto**: Botones Ollama / Gemini / Hybrid en el dashboard para cambiar el motor activo en caliente, con badge visual del modo actual y refresco automÃ¡tico cada 15 segundos.
- **Nuevos endpoints**: `GET /api/ia/inline_stats` y `POST /api/ia/inline_stats/set_default` para consultar y cambiar el motor por defecto desde el dashboard sin reiniciar.

## [v16.35.0] - 2026-05-07
### SelecciÃ³n de IA por Modo y EstadÃ­sticas Inline/Guest
- **SelecciÃ³n de motor IA por query**: Inline Mode y Guest Mode detectan prefijos `/ollama`, `/gemini` o `/hybrid` al inicio del mensaje para forzar el motor concreto sin tocar la configuraciÃ³n global.
- **Preferencia global persistente**: Si no se especifica prefijo, se usa `default_ai_mode` de `GLOBAL_SETTINGS`; se puede cambiar en caliente sin reiniciar.
- **EstadÃ­sticas de uso IA**: Nuevo sistema `INLINE_GUEST_AI_STATS` en base de datos que registra cada solicitud (modo, usuario, motor usado, tiempo de respuesta, Ã©xito/fallo) con historial de hasta 500 eventos recientes.
- **API de estadÃ­sticas**: Nuevo mÃ©todo `get_ai_statistics()` en `InvokedAIService` que devuelve resumen total, desglose inline/guest, distribuciÃ³n por motor (ollama/gemini/hybrid), tasa de Ã©xito y tiempo medio de respuesta.
- **CachÃ© inline diferenciada por IA**: La clave de cachÃ© de respuestas inline incluye ahora la preferencia de IA para evitar devolver la respuesta del motor equivocado ante el mismo query.
- **Logs enriquecidos**: Los registros de Inline IA y Guest Bot muestran ahora quÃ© motor respondiÃ³ en cada interacciÃ³n.
- **Nuevo plugin `inline_guest_ai_settings`**: Tres comandos de gestiÃ³n solo para master/admin:
  - `/ia_stats` â€” EstadÃ­sticas completas de uso IA con los Ãºltimos 5 eventos detallados.
  - `/ia_set_default <ollama|gemini|hybrid>` â€” Cambia el motor por defecto para inline y guest en caliente.
  - `/ia_info` â€” Muestra el motor activo, disponibilidad de Ollama y Gemini, y modo de operaciÃ³n actual.
- **`.gitignore` ampliado**: Se excluyen ficheros de instrucciones locales para agentes IA (`AGENTS.md`, `.instructions.md`, `.prompt.md`, `.agent.md`, `copilot-instructions.md`) para evitar commitear personalizaciones de entorno.

## [v16.34.0] - 2026-05-07
### Start Script Modular
- **Version dinamica**: `start.sh` lee `APP_VERSION` desde `core.config` para evitar banners desincronizados.
- **Chequeo de modulos core**: Nuevo comando `bash start.sh modules` valida imports de `core.config`, `core.db`, `core.telegram_api`, `core.invoked_ai`, `core.telegram_events`, tokens y bans.
- **Doctor reforzado**: `doctor` comprueba tambien los modulos internos antes de declarar la instancia saludable.
- **Auto-update mas fiable**: La deteccion de commits pendientes usa `git rev-list HEAD..origin/master` en vez de depender del texto de `git status`.
- **Arranque mas seguro**: Antes de lanzar `moon_multibot.py`, el script valida que el core modular pueda importarse.

## [v16.33.0] - 2026-05-07
### Modulo de Eventos Telegram
- **Nuevo modulo `core.telegram_events`**: Extrae el almacenamiento de `business_connection` y `managed_bot` fuera de `moon_multibot.py`.
- **Business Connections aisladas**: El panel consulta conexiones desde un store especializado en vez de leer estado directo del bot.
- **Managed Bots desacoplados**: Los updates `managed_bot` se registran desde el nuevo store, dejando el loop principal mas delgado.
- **Preparado para mas eventos**: Deja una ubicacion clara para futuros updates administrativos sin inflar `MoonBot`.

## [v16.32.0] - 2026-05-07
### Fragmentacion de IA Invocada
- **Nuevo modulo `core.invoked_ai`**: Extrae la logica de Guest Mode e Inline Mode fuera de `moon_multibot.py`.
- **Cache inline de baja latencia**: Reutiliza respuestas IA para consultas inline repetidas durante una ventana corta y evita regeneraciones innecesarias.
- **Rate limits aislados**: Los controles de frecuencia de Guest e Inline viven en el servicio especializado, no en el runtime principal.
- **Handlers delgados**: `MoonBot` conserva solo wrappers para conectar Telegram, bans y envio de mensajes con el servicio modular.
- **Base de rendimiento**: El runtime queda preparado para mover mas servicios sin tocar el bucle principal de updates.

## [v16.31.0] - 2026-05-07
### IA para Guest Mode e Inline Mode
- **Motor IA invocado**: Guest Mode e Inline Mode comparten prompts especificos para respuestas breves, utiles y listas para Telegram.
- **Inline IA real**: Nuevo `handle_inline_query` con `answerInlineQuery` y resultados tipo articulo: respuesta completa, version breve y prompt refinado.
- **Guest Mode mejorado**: Las invocaciones guest usan el mismo motor IA y pueden aprovechar el mensaje citado como contexto temporal.
- **Proteccion remota**: Inline/Guest aplica bans globales y CAS antes de generar IA, con rate limit por usuario para reducir bucles.
- **Feedback inline**: Se registran `chosen_inline_result` recientes para auditar que resultados IA se seleccionan.

## [v16.30.0] - 2026-05-07
### Guest Bots y Telegram Bot API 9.6
- **Guest Mode preparado**: `getUpdates` solicita updates modernos y el runtime detecta updates Guest Bot de forma tolerante (`guest_message`, `guest_interaction` o `guest_bot`).
- **Respuesta puntual de invitado**: Las invocaciones guest se procesan como contexto temporal y generan una sola respuesta sin registrar el chat como grupo administrado.
- **Proteccion mantenida**: Guest Bot pasa por bans persistentes y CAS antes de responder, con rate limit corto por usuario/chat para evitar bucles.
- **Cliente Telegram centralizado**: Nuevo modulo `core.telegram_api` con version objetivo `9.6`, normalizacion de metodos legacy y manejo robusto de respuestas.
- **Business y Managed Bots**: El bot acepta `business_connection` y `managed_bot`, registra sus eventos y expone helpers para `getManagedBotToken` y `replaceManagedBotToken`.
- **Terminal RAW actualizado**: Se retira `kickChatMember`, se usa `banChatMember` y se agregan metodos recientes como `sendMessageDraft`, foto de perfil y Managed Bots.

## [v16.29.0] - 2026-05-04
### Primer Corte Modular y Versionado Sincronizado
- **Modulo `core.config`**: Centraliza version, rutas, credenciales web, entorno, claves IA y seleccion de base de datos.
- **Modulo `core.db`**: Extrae `DBManager` fuera de `moon_multibot.py` para aislar SQLite y facilitar pruebas.
- **Compatibilidad preservada**: `moon_multibot.py` conserva las mismas variables globales importadas para evitar cambiar el comportamiento runtime.
- **Version visible sincronizada**: Banner de `start.sh`, badge del dashboard y `/api/status.version` quedan alineados con `v16.29.0`.
- **Base para futuros modulos**: Deja preparado el siguiente corte hacia rutas Flask, servicios de seguridad y runtime Telegram sin mover todo de golpe.

## [v16.28.0] - 2026-05-04
### Bans CAS, Globales y Locales Reforzados
- **CAS ahora aplica bans reales**: La deteccion de `api.cas.chat` ya no se limita a registrar el evento; ahora borra el mensaje, guarda el ban global y ejecuta `banChatMember`.
- **Bans locales por grupo**: Nuevo almacenamiento `BANS_{cid}` para separar bans locales de cada grupo y evitar que `/ban` contamine una lista global legacy.
- **Bans globales persistentes**: `GLOBAL_BANS` se consulta en el runtime y se re-aplica si el usuario vuelve a escribir o entra en otro grupo conocido.
- **Migracion legacy**: Los antiguos `ST_FILE["bans"]` se incorporan al sistema global para no perder baneos existentes.
- **Motor unico de enforcement**: Nuevo flujo `apply_user_ban`, `enforce_existing_ban` y `enforce_cas_ban` para centralizar guardado, borrado de mensaje, expulsion y logs.
- **Comandos claros**: `/ban` y `/unban` actuan localmente en el grupo actual; `/gban` y `/ungban` gestionan bans globales.
- **Panel y API ajustados**: `/api/users/ban` con `cid` crea ban local por defecto; sin `cid` crea ban global y lo propaga a grupos conocidos.
- **CAS en entradas nuevas**: `new_chat_members` tambien pasa por CAS y por bans persistidos antes de permitir actividad.
- **Bot correcto por grupo**: Las acciones del panel intentan usar el bot asociado al chat en vez de asumir siempre `active_bots[0]`.
- **Validacion realizada**: Compilacion Python, pruebas unitarias del gestor, simulacion runtime de Telegram, endpoints Flask temporales y consulta real a CAS.

## [v16.27.1] - 2026-05-04
### Seguridad de Tokens y Gestion de Bots
- **Tokens ocultos en el panel**: `/api/bots` deja de devolver tokens completos y expone solo `id` publico y `token_preview`.
- **Identificadores seguros**: La interfaz usa IDs derivados del token para acciones como desplegar ajustes o eliminar bots, sin incrustar el token real en HTML/JS.
- **Alta de bots persistente**: `POST /api/bots` guarda nuevos bots en `data/bots.json` cifrado y los arranca en caliente cuando es posible.
- **Eliminacion persistente**: `DELETE /api/bots` elimina por `id`, actualiza `data/bots.json` y limpia cache/runtime del bot.
- **Descargas autenticadas sin token en URL**: Los CSV de auditoria usan cabecera `Authorization` en vez de pasar el JWT por query string.
- **Cabeceras auth normalizadas**: El frontend evita construir `Bearer Bearer ...` al reutilizar tokens guardados.
- **Documentacion saneada**: README, `.env.example` y Dockerfile se limpiaron para quitar mojibake y documentar mejor `CIPHER_KEY`, variables seguras y arranque.
- **Validacion realizada**: Compilacion Python de modulos principales y `node --check web/script.js`.

## [v16.27.0] - 2026-04-30
### Estadisticas Reales VPS para MTProto
- **Asistente `start.sh mtproto`**: Permite introducir secrets MTProto existentes, generar uno nuevo o cargar varios secrets/puertos locales en `.env`.
- **Importacion local de proxies**: El bot importa `PROXY_SECRET`/`PROXY_PORT` y `PROXY_LOCAL_SECRETS`/`PROXY_LOCAL_PORTS` al gestor sin borrar proxies existentes.
- **Conexion SSH al VPS**: Nueva configuracion `PROXY_VPS_*` y panel para guardar host, usuario, puerto, ruta de clave y puertos.
- **Secretos fuera de la web**: Password SSH y passphrase de clave solo se leen desde variables de entorno (`PROXY_VPS_PASSWORD`, `PROXY_VPS_KEY_PASSPHRASE`); no se guardan desde el dashboard.
- **Stats reales de puertos**: El dashboard lee `ss` en el VPS para comprobar `8443`, `8444`, `8445`, `8446` u otros puertos configurados.
- **Docker real**: Lectura de `docker ps` y `docker stats --no-stream` para mostrar CPU, RAM, trafico y puertos publicados.
- **Deteccion de secret MTProto**: Parseo de logs del contenedor proxy para sugerir enlace real con el puerto publicado.
- **PestaÃ±a visible de Proxies**: Acceso directo en la navegacion principal junto a Seguridad, Cola y Cambios para evitar pestaÃ±as perdidas.
- **Dependencia SSH validada**: `start.sh` comprueba `paramiko` como libreria critica antes de arrancar.
- **Nuevos endpoints**: `/api/proxies/vps/config` y `/api/proxies/vps/stats`.

## [v16.26.0] - 2026-04-30
### Aprendizaje de Programacion para Moon IA
- **Nueva fuente Programming**: La expansion multifuente acepta `programming` para enseÃ±ar lenguajes y patrones de desarrollo.
- **Semillas de programacion**: La IA aprende fundamentos, estructuras de datos, algoritmos, testing, debugging, seguridad, APIs, bases de datos, concurrencia y DevOps.
- **Lenguajes incluidos**: Python, JavaScript, TypeScript, SQL, HTML, CSS, Java, Go, Rust, PHP y Bash, con fallback para lenguajes personalizados.
- **Dashboard actualizado**: Nueva opcion `Programacion (Lenguajes)` y boton `ENSEÃ‘AR PROGRAMACION CORE`.
- **Comando Telegram Admin/Master**: Nuevo `/ia_programar python,javascript,sql` con alias `/ia_code` y `/programar_ia`.

## [v16.25.0] - 2026-04-30
### Auto-Update Docker Sin Interaccion
- **Actualizacion automatica en arranque Docker**: `start.sh` aplica `git pull origin master` automaticamente si detecta que el contenedor esta atrasado.
- **Control por entorno**: `AUTO_DOCKER_UPDATE=true` queda activado en `docker-compose.yml`; puede desactivarse con `false`.
- **Dashboard sin confirmacion manual**: El boton de actualizacion ya no muestra `confirm()` y ejecuta la actualizacion directamente.
- **Rebuild Docker automatizado**: El endpoint `/api/system/update` intenta ejecutar `docker compose up -d --build --remove-orphans` cuando Docker esta disponible.
- **Reinicio automatico del proceso**: Tras aplicar cambios, el bot programa un reinicio del proceso para cargar el codigo actualizado.

## [v16.24.0] - 2026-04-30
### Mantenimiento Autonomo y Backups en Silencio
- **Mantenimiento desacoplado**: Las tareas periodicas se mueven a `run_periodic_maintenance()` para reutilizar el mismo flujo sin duplicar logica.
- **Backups sin actividad de chat**: El backup 24H y el backup de aprendizaje 1H ahora se comprueban tambien cuando Telegram no entrega mensajes nuevos.
- **Backup 24H intacto**: Se conserva la copia completa diaria al Master.
- **Backup aprendizaje 1H intacto**: Se conserva la copia horaria con progreso neural e hito 1B/12H.
- **Mayor fiabilidad operativa**: Sincronizacion de seguridad y purga multimedia tambien quedan protegidas contra periodos de silencio.

## [v16.23.0] - 2026-04-30
### Hito 1 Billon / 12H y Balanceador Neural
- **Nueva meta extrema**: Objetivo de 1 billon de palabras aprendidas en 12 horas.
- **Balanceador de carga neural**: Nuevo sistema controlado de workers que calcula instancias necesarias y reparte fuentes de libros.
- **Panel de control en interfaz**: Nuevo indicador `Hito 1 billon / 12H` y controles para lanzar/detener workers desde el Dashboard.
- **Fuentes literarias ampliadas**: La expansion maestra y el balanceador usan una biblioteca ampliada de Project Gutenberg.
- **Backup 24H preservado**: Se mantiene la copia automatica diaria completa al Master.
- **Backup de aprendizaje cada 1H**: Nueva copia horaria centrada en el progreso neural, configurable desde `GLOBAL_SETTINGS.learning_backup_interval`.
- **Proteccion operativa**: El balanceador respeta un maximo de workers configurable para evitar lanzar procesos infinitos.

## [v16.22.0] - 2026-04-30
### Hito Neural 1M / 1H
- **Nueva meta de aprendizaje**: La madurez principal de la IA sube de 100.000 a 1.000.000 de palabras aprendidas.
- **Objetivo de velocidad**: Nuevo hito operativo para alcanzar 1.000.000 de palabras en 60 minutos.
- **Metricas de progreso**: La API de IA expone progreso, palabras restantes, tasa requerida y estado del hito.
- **Dashboard actualizado**: Nuevo indicador `Hito 1M / 1H` en el panel del Cerebro Moon.
- **Estado inteligente**: El sistema marca si la IA va en ritmo de 1 hora o si necesita acelerar el aprendizaje.

## [v16.21.0] - 2026-04-30
### Traduccion IA Natural y Aprendizaje Local
- **Traduccion sin comandos**: La IA detecta peticiones naturales como `traduce hola al ingles`, `como se dice gracias en aleman` o `translate hello to Spanish`.
- **Soporte en respuestas**: Al responder a un mensaje con `traduce esto al ingles`, el bot traduce el contenido del mensaje citado.
- **Memoria local de traducciones**: Las traducciones aprendidas se guardan en `IA_TRANSLATION_MEMORY` para reutilizarse sin pedir ayuda externa.
- **Aprendizaje desde motores externos**: Si Gemini u Ollama generan una traduccion nueva, la IA local la aprende automaticamente.
- **Comando de ensenanza manual**: Nuevo `/aprender_traduccion es en hola = hello` para introducir traducciones exactas en la memoria local.
- **Compatibilidad preservada**: Se mantienen `/traducir`, `/translate`, `/tr`, Gemini, Ollama y el endpoint `/api/ia/translate`.

## [v16.20.0] - 2026-04-30
### ðŸ›¡ï¸ Seguridad y Respaldo Total
- **Copias de Seguridad Manuales**: AÃ±adido botÃ³n en el Dashboard para solicitar una copia completa del "cerebro" (DB) enviada instantÃ¡neamente por Telegram.
- **Backup AutomÃ¡tico 24h**: El sistema ahora envÃ­a automÃ¡ticamente un respaldo de seguridad al Administrador cada 24 horas.

## [v16.19.0] - 2026-04-30
### ðŸŒ ExpansiÃ³n de Conocimiento Personalizada
- **Inyector por TÃ³picos**: Nueva herramienta que permite escribir una lista de temas separados por comas para que la IA aprenda de Wikipedia de forma dirigida.
- **Reportes de TÃ³picos**: Informe detallado al finalizar el aprendizaje de temas especÃ­ficos.

## [v16.18.0] - 2026-04-30
### ðŸ”Ž AuditorÃ­a Neuronal Interactiva
- **Fuentes Desplegables**: Ahora se puede hacer clic en las "Top Fuentes" para ver una muestra real de las palabras aprendidas de cada origen.
- **ActualizaciÃ³n Real-Time (2s)**: Reducido el intervalo de actualizaciÃ³n de estadÃ­sticas en el panel a 2 segundos para una monitorizaciÃ³n fluida.


## [v16.17.0] - 2026-04-30
### ðŸ“Š Sistema de Reportes y Notificaciones Automatizadas
- **Reportes de Inteligencia Maestra**: Ahora el bot envÃ­a un resumen detallado vÃ­a Telegram al Administrador cuando finaliza un proceso de sembrado masivo (Wikipedia/Patrones).
- **ResÃºmenes Diarios de Salud Neural**: Implementado un trabajador en segundo plano que envÃ­a un reporte cada 24 horas con las estadÃ­sticas de crecimiento (neuronas, sinapsis, tasa de aprendizaje).
- **Notificaciones en Tiempo Real**: El bot avisa al iniciar procesos de expansiÃ³n cerebral para que el usuario estÃ© informado del progreso.
- **Mejoras en la Estructura de Datos**: OptimizaciÃ³n en la persistencia de las fuentes de aprendizaje para generar rankings de conocimiento.


## [v16.16.0] - 2026-04-30
### ðŸ§  Inteligencia Maestra y Estabilidad CrÃ­tica
- **IntegraciÃ³n de Master Intelligence (Advanced IA)**:
  - FusiÃ³n nativa del inyector de conocimiento en el nÃºcleo principal (`MoonCoreIA`).
  - **Wikipedia Master Seeding**: El bot ahora puede absorber conocimiento enciclopÃ©dico sobre Ciencia, Historia, TecnologÃ­a y mÃ¡s directamente desde la API de Wikipedia.
  - **InyecciÃ³n de Patrones Humanos**: AÃ±adidos protocolos de conversaciÃ³n natural para humanizar las respuestas de la IA.
  - **Trigger desde Dashboard**: Nuevo botÃ³n premium en la pestaÃ±a de IA para disparar la expansiÃ³n cerebral en un clic.
- **Robustez y Blindaje Neural**:
  - **Protocolo `_ensure_counters`**: Sistema de auto-reparaciÃ³n de la red neuronal que garantiza la integridad de los datos y previene el error `'dict' object has no attribute 'most_common'`.
  - **SincronizaciÃ³n Hot-Reload**: Mejora en la recarga del cerebro en caliente para asegurar que los nuevos conocimientos se apliquen instantÃ¡neamente sin reiniciar el bot.
- **OptimizaciÃ³n de Entorno y Conflictos**:
  - **DetecciÃ³n de Instancias Duplicadas**: Protocolo para evitar el error `Conflict` de Telegram al cerrar sesiones locales si el bot estÃ¡ corriendo en la nube.
- **Mejoras de UI/UX (IA Dashboard)**:
  - RediseÃ±o de la zona de evoluciÃ³n con nuevos botones de acciÃ³n masiva.
  - Toasts de notificaciÃ³n mejorados para procesos asÃ­ncronos de larga duraciÃ³n.


## [v16.15.0] - 2026-04-28
### ðŸš€ Auto-GestiÃ³n y ModeraciÃ³n de Ã‰lite
- **Sistema de ActualizaciÃ³n Inteligente (CI/CD)**: 
  - IntegraciÃ³n nativa de **Git dentro de Docker**.
  - Panel de actualizaciÃ³n en un clic desde el Dashboard.
  - DetecciÃ³n automÃ¡tica de versiones y commits en tiempo real.
- **ModeraciÃ³n Avanzada en Grupos (Telegram Nativo)**:
  - **Soporte para Reply (Respuestas)**: Comandos `/ban`, `/mute`, `/warn` ahora funcionan respondiendo a mensajes del usuario.
  - **Ã“rdenes de EjecuciÃ³n Real**: El bot ahora expulsa, banea y restringe permisos de forma real en la API de Telegram.
  - **Comando `/settings` de Grupo**: Consulta de configuraciÃ³n de seguridad y estado de IA directamente desde el chat.
  - **Alias de Comandos**: Soporte para `/comandos`, `/help`, `/inicio`.
- **Mejoras de TelemetrÃ­a en Chat Web**:
  - **Etiquetas de Estado en Vivo**: IdentificaciÃ³n visual inmediata de usuarios `BANNED`, `MUTED` o con `WARNS` activos en el historial.
  - **Remote Command Console**: Capacidad de ejecutar comandos de sistema directamente desde el chat del Dashboard.
  - **Feedback Visual de Acciones**: Toasts y confirmaciones interactivas tras ejecutar acciones rÃ¡pidas.
- **Seguridad e IA (Robustez)**:
  - **IA Command Shield**: Blindaje total que impide a la IA responder a mensajes que empiecen por `/`.
  - **Dynamic Permission Refresh**: ReducciÃ³n de la cachÃ© de admins a 5 minutos para reconocer cambios de rango al instante.
  - **Blindaje de MASTER_ID**: Limpieza y validaciÃ³n estricta del ID de administrador para control absoluto.
- **Docker & Infraestructura**:
  - Mapeo de volÃºmenes para persistencia de Git y actualizaciones persistentes.
  - CorrecciÃ³n de dependencias crÃ­ticas (`psutil`) y optimizaciÃ³n de hilos de arranque.

## [v16.14.0] - 2026-04-27
### ðŸ”¥ Novedades Premium y GlobalizaciÃ³n
- **Plataforma de TraducciÃ³n Centralizada (i18n)**: 
  - Soporte multi-idioma nativo (ES, EN, FR, DE, IT, PT).
  - Motor de traducciÃ³n dinÃ¡mica en tiempo real para todo el dashboard.
  - **IA Translator**: Capacidad de la IA para generar automÃ¡ticamente traducciones de la interfaz a nuevos idiomas.
- **Telegram Business Automation (Chatbots)**:
  - Soporte nativo para actuar en nombre de cuentas personales/empresa.
  - **Auto-Greetings**: Mensajes de bienvenida automÃ¡ticos para nuevos clientes.
  - **Away Mode**: Respuestas automÃ¡ticas fuera de horario o disponibilidad.
  - **Quick Replies**: GestiÃ³n de atajos de teclado para respuestas rÃ¡pidas.
  - **IA Business Agent**: DelegaciÃ³n de respuestas a la IA en chats de Business.
- **Gestor de Proxies MTProto**:
  - Panel dedicado para desplegar y monitorizar nodos de proxy propios.
  - TelemetrÃ­a en tiempo real: Conexiones activas, trÃ¡fico (Upload/Download) y estado del proceso.
  - Control de ciclo de vida: Start/Stop/Remove de nodos desde la web.
- **Centro de Seguridad & VirusTotal**:
  - Nueva pestaÃ±a de Seguridad para auditorÃ­a de amenazas.
  - IntegraciÃ³n con API de VirusTotal para anÃ¡lisis de hashes en tiempo real.
  - Monitor de lÃ­mites de API (Free Tier) y registro de incidentes.
- **Ajustes Locales por Nodo (Per-Group Config)**:
  - **IA Moods**: SelecciÃ³n de personalidad por grupo (Amigable, Serio, SarcÃ¡stico, Agresivo).
  - **Anti-Link**: Sistema de bloqueo de enlaces externos configurable.
  - **Anti-Flood**: ProtecciÃ³n automÃ¡tica contra spam (silencio automÃ¡tico).
  - **Clean Join**: Auto-borrado de mensajes de servicio de entrada de usuarios.
- **RediseÃ±o Premium UI**:
  - Nuevos **Designed Selectors** (estilo iOS) con efectos de brillo y animaciones.
  - Sidebar de ajustes nodal optimizada y persistente.
- **Motor Universal Telegram API**: 
  - IntegraciÃ³n completa de la Bot API. Soporte para llamadas RAW y parÃ¡metros JSON desde el Dashboard.
  - Nueva pestaÃ±a **Terminal Universal** para ejecuciÃ³n de comandos en caliente.
- **Herramientas Admin**: Comandos `/pin`, `/title`, `/kick`, `/mute`, `/promote`, `/demote`.

## [v16.13.0] - 2026-04-27 (The Architecture & Stability Update) ðŸ—ï¸ðŸš€ðŸ›¡ï¸âš¡

### ðŸ—ï¸ Arquitectura y Desacoplamiento
- **ðŸ“¦ Desacoplamiento de Semillas:** Se han extraÃ­do mÃ¡s de 1500 lÃ­neas de datos estÃ¡ticos a un archivo JSON externo (`data/multilingual_seeds.json`), optimizando la carga y legibilidad del cÃ³digo base.
- **ðŸ§¹ Limpieza Profunda del Core:** EliminaciÃ³n de ~2500 lÃ­neas de cÃ³digo redundante, repetido o roto en `moon_multibot.py`. El archivo principal es ahora un 50% mÃ¡s ligero y eficiente.
### ðŸ›¡ï¸ Seguridad y ModeraciÃ³n (Neural Shield)
- **ðŸš« Ban AutomÃ¡tico por Contenido:** El sistema ahora detecta y expulsa automÃ¡ticamente a usuarios que envÃ­en material de **porno** o **terrorismo**.
- **ðŸ§  HeurÃ­sticas Visuales:** IntegraciÃ³n de NPHE para identificar patrones sospechosos (tonos de piel, ambientes sombrÃ­os, bitrates anÃ³malos) sin APIs externas.
- **ðŸ“ Lista Negra Expandida:** InclusiÃ³n de mÃ¡s de 20 nuevos tÃ©rminos prohibidos en el filtro de seguridad global.

- **ðŸ§  Neural Perception Heuristic Engine (NPHE):** ImplementaciÃ³n de un motor de anÃ¡lisis de medios 100% nativo y local (Zero-API).
- **ðŸ–¼ï¸ PercepciÃ³n de ImÃ¡genes Avanzada:** Soporte para PNG, JPEG, WebP y GIF con anÃ¡lisis de complejidad, tonos predominantes y ambiente de escena.
- **ðŸŽ¥ TelemetrÃ­a de Video Pro:** ExtracciÃ³n de metadatos en MP4/MOV, cÃ¡lculo de bitrate e identificaciÃ³n de cÃ³decs (H.264, HEVC, VP9).

### ðŸš€ Multibot y Despliegue
- **ðŸ¤– Soporte Multibot Nativo:** El sistema ahora inicia automÃ¡ticamente todos los bots configurados en `bots.json` en hilos paralelos independientes.
- **ðŸŒ Modos de Entorno (Dev/Stable):**
    - **Modo Dev:** Activado vÃ­a `.env`. Incluye logs en `DEBUG`, base de datos de pruebas (`moon_dev.db`), Flask con auto-recarga y puerto alternativo (`5001`).
    - **Modo Stable:** Optimizado para producciÃ³n con logs limpios, puerto `5000` y persistencia en base de datos oficial.
- **ðŸ·ï¸ Badge de Entorno:** Nueva etiqueta visual "DEV MODE" en el Dashboard para identificar rÃ¡pidamente el ambiente de ejecuciÃ³n.

### ðŸ”§ Mejoras TÃ©cnicas y Fixes
- **âš–ï¸ Fix de Rangos:** Los comandos de plugins ahora usan comparaciones de rango (`rank`) insensibles a mayÃºsculas, evitando fallos con el rango "Master".
- **ðŸ§  Fix de Referencias IA:** Cada instancia de bot ahora posee su propia referencia interna `self.ia` hacia el nÃºcleo neuronal, eliminando dependencias globales inestables.
- **ðŸ› ï¸ RestauraciÃ³n de MÃ©todos:** Recuperada la funcionalidad de `evolve_process` que habÃ­a quedado truncada en versiones anteriores.

## [v16.12.0] - 2026-04-27 (The Global Language Expansion) ðŸŒðŸ—£ï¸ðŸŒ

### ðŸŒ ExpansiÃ³n Masiva de Idiomas

- **ðŸ—£ï¸ 37 Idiomas Soportados:** ExpansiÃ³n completa del soporte multilingÃ¼e de 22 a **37 idiomas**. La IA ahora puede detectar, aprender y generar respuestas en lenguas europeas adicionales (danÃ©s, noruego, finlandÃ©s, estonio, letÃ³n, lituano, eslovaco, esloveno, croata, bosnio, serbio, macedonio, bÃºlgaro, albanÃ©s, maltÃ©s, islandÃ©s, irlandÃ©s, galÃ©s, gaÃ©lico escocÃ©s), lenguas occidentales europeas (vasco, catalÃ¡n, gallego, occitano, bretÃ³n, frisÃ³n, luxemburguÃ©s, valÃ³n) y otras lenguas (corso, romanÃ©s, sardo).
- **ðŸ“š Corpus Conversacional Expandido:** AÃ±adidas **20 frases cotidianas por idioma** en escritura nativa real para cada uno de los 37 idiomas, totalizando mÃ¡s de 740 frases conversacionales nuevas. Las frases cubren saludos, despedidas, agradecimientos, planes diarios, conversaciÃ³n cotidiana y expresiones comunes.
- **ðŸ” DetecciÃ³n Mejorada:** Actualizado el mapa de palabras clave (`kw_map`) con tÃ©rminos especÃ­ficos para cada idioma nuevo, mejorando la precisiÃ³n de detecciÃ³n automÃ¡tica de idioma en mensajes entrantes.
- **ðŸ”— Conectores Gramaticales:** AÃ±adidos conectores lÃ³gicos nativos ("y", "pero", "aunque", etc.) para todos los 37 idiomas, permitiendo respuestas mÃ¡s naturales y coherentes en cada lengua.
- **ðŸ“Š Panel Web Actualizado:** El panel de IA en la interfaz web ahora muestra dinÃ¡micamente el nÃºmero real de idiomas soportados (37) en lugar de un valor estÃ¡tico.

### ðŸ”§ Mejoras TÃ©cnicas

- **ðŸŒ Endpoint `/api/ia/stats` Mejorado:** AÃ±adido campo `supported_languages` que devuelve la lista completa de idiomas soportados para sincronizaciÃ³n con la interfaz web.
- **âš¡ OptimizaciÃ³n de Rendimiento:** La detecciÃ³n de idioma y selecciÃ³n de conectores se realiza una sola vez por mensaje, manteniendo la eficiencia incluso con 37 idiomas disponibles.

## [v16.11.0] - 2026-04-27 (The Intelligence & Presence Update) ðŸ§ ðŸŽ¯ðŸ€ðŸ·ï¸

### âœ¨ Nuevas Funcionalidades

- **ðŸŽ¯ DetecciÃ³n de IntenciÃ³n Real:** Nueva funciÃ³n `detect_intent()` que clasifica cada mensaje entrante en 5 categorÃ­as (saludo, despedida, agradecimiento, queja, pregunta). La IA adapta automÃ¡ticamente el prefijo de su respuesta al tipo de mensaje detectado, haciendo las respuestas mucho mÃ¡s naturales y coherentes.
- **ðŸ€ Lucky Drop System:** 5% de probabilidad de obtener +5 karma al interactuar con la IA. AÃ±ade un elemento de sorpresa y gamificaciÃ³n que incentiva la participaciÃ³n activa con el bot.
- **ðŸ·ï¸ Sistema de Flags de Usuario (`/flag`):** Los admins y el Master pueden marcar usuarios con etiquetas visuales: `ðŸ’Ž VIP`, `ðŸ›¡ï¸ Staff`, `âš ï¸ Sospechoso` o `ðŸ‘¤ Normal`. Las flags se almacenan por grupo en la base de datos y aparecerÃ¡n en el perfil de usuario.
- **ðŸ“Š Comando `/resumen`:** Genera un resumen de la actividad reciente del grupo disponible para admins y Master. Muestra los usuarios mÃ¡s activos del perÃ­odo y una sÃ­ntesis generada por la IA sobre los temas del chat.
- **ðŸ“š Auto-FAQ con Respuestas Configurables:** El sistema FAQ ya no solo cuenta preguntas repetidas, ahora las responde automÃ¡ticamente. Cuando una pregunta se hace 3 o mÃ¡s veces y tiene una respuesta guardada, el bot la responde de forma directa. Nuevos endpoints: `POST /api/automation/faq/set` y `POST /api/automation/faq/delete` para gestionar el banco de respuestas desde el panel.

### ðŸ”§ Correcciones de Bugs

- **ðŸ”‡ Fix `/listen on/off`:** Corregido el bug crÃ­tico por el cual los comandos de modo escucha nunca funcionaban. La declaraciÃ³n `global listen_mode` estaba ausente en la funciÃ³n `run()` de `MoonBot`, haciendo que la asignaciÃ³n creara una variable local en vez de modificar el estado global.
- **ðŸ“œ Fix `global_msg_log`:** AÃ±adida la declaraciÃ³n `global global_msg_log` correcta para que el historial global se sincronice realmente entre hilos en lugar de descartarse silenciosamente.
- **ðŸŒ Fix `/search` â€” DuckDuckGo API:** Reemplazado el scraping de Google (bloqueado por robots.txt y clases CSS obsoletas) por la API oficial de DuckDuckGo Instant Answer. El buscador ahora funciona de forma real, devuelve resultados y los inyecta en el cerebro como conocimiento nuevo.
- **âœ… Fix variable `matched` no utilizada:** La variable de control de auto-respuestas S_FILE ahora hace correctamente `continue` cuando encuentra una coincidencia, evitando procesar el mismo mensaje por mÃºltiples ramas de comandos.

### ðŸŒ Mejoras de IA

- **ðŸŒ Conectores LÃ³gicos en 13 Idiomas:** La funciÃ³n `generate()` detecta el idioma del mensaje entrante y usa conectores nativos del idioma correspondiente al construir la respuesta: ES, EN, FR, DE, IT, PT, TR, RU, ZH, JA, KO, AR, HI.
- **ðŸ“¡ OptimizaciÃ³n del Bucle de DetecciÃ³n:** El cÃ¡lculo del idioma para conectores se realiza una vez por generaciÃ³n, no en cada iteraciÃ³n del bucle Markov.

## [v16.10.3] - 2026-04-27 (The Contextual Language Update) ðŸ§ ðŸŒðŸ’¬
### ðŸ”§ Mejoras
- **ðŸ’¬ Conectores LÃ³gicos MultilingÃ¼es:** La IA ahora detecta el idioma del mensaje entrante y usa conectores nativos del mismo idioma al generar respuestas (13 idiomas: ES, EN, FR, DE, IT, PT, TR, RU, ZH, JA, KO, AR, HI). Las respuestas en inglÃ©s usan "but/also/however", en japonÃ©s "ã§ã‚‚/ã¾ãŸ/ã—ã‹ã—", etc.


## [v16.10.2] - 2026-04-27 (The Performance Update) âš¡ðŸš€
### ðŸ”§ Mejoras
- **âš¡ Anti-Flood en Memoria RAM:** El sistema de control de flood migrado de SQLite a un dict en memoria. Elimina 2 operaciones de base de datos por cada mensaje recibido, reduciendo la latencia del bucle principal especialmente en grupos de alta actividad.


## [v16.10.1] - 2026-04-27 (The Security Hotfix) ðŸ›¡ï¸ðŸ”§
### ðŸ› Correcciones CrÃ­ticas
- **ðŸ”§ Fix Escudo Neural:** Corregido el `AttributeError` que causaba que el escudo de seguridad fallara silenciosamente al intentar eliminar contenido prohibido. `last_msg_id` y `last_media_hash` ahora se inicializan correctamente en el arranque y se actualizan con cada mensaje.
- **ðŸš« Comando `/ban_media` Implementado:** Finalmente implementado el comando anunciado en v16.7.0. El Master puede enviar un archivo al grupo, ejecutar `/ban_media` y su hash SHA-256 queda permanentemente en la lista negra global. El archivo serÃ¡ eliminado automÃ¡ticamente en cualquier grupo donde el bot estÃ© presente.


## [v16.10.0] - 2026-04-27 (The Backup & Native Polyglot Update) ðŸ§ ðŸ’¾ðŸŒðŸ”„
### âœ¨ Nuevas Funcionalidades
- **ðŸ’¾ Comando `/backup_db`:** El Master puede solicitar en cualquier momento el envÃ­o directo de la base de datos completa (`moon_database.db`) por Telegram. Incluye el tamaÃ±o del archivo y queda registrado en el log de auditorÃ­a.
- **ðŸ”„ Backup AutomÃ¡tico 24h:** El sistema envÃ­a automÃ¡ticamente una copia de la base de datos al Master cada 24 horas en segundo plano, sin interrumpir el funcionamiento del bot.

### ðŸ”§ Mejoras y Correcciones
- **ðŸŒ DetecciÃ³n de Idioma por Unicode (Nativa):** Reescritura total del motor `detect_lang`. Ãrabe, Hindi, Ruso, Chino, JaponÃ©s, Coreano y TailandÃ©s se detectan ahora por **rango Unicode**, eliminando falsos positivos de las romanizaciones anteriores.
- **ðŸ“š Corpus Conversacional Real (14 Idiomas):** ExpansiÃ³n de `seed_multilingual` de 48 frases genÃ©ricas de tecnologÃ­a a **258 frases cotidianas** en escritura nativa real: ES, EN, FR, DE, IT, PT, TR, KO, HI, AR, RU, ZH, JA. Las frases cubren saludos, despedidas, agradecimientos, planes, conversaciÃ³n diaria y mÃ¡s.
- **ðŸ’¿ Guardado Forzado Post-Semilla:** El cerebro ahora se persiste en SQLite inmediatamente al finalizar `seed_multilingual`, garantizando que ninguna neurona nueva se pierda en reinicios.


## [v16.9.0] - 2026-04-26 (The Universal Polyglot Update) ðŸŒŒðŸŒŽðŸ§ ðŸ“¡
### âœ¨ Nuevas Funcionalidades
- **ðŸŒŒ Cerebro Universal (25+ Idiomas):** ExpansiÃ³n masiva del motor lingÃ¼Ã­stico para soportar Ã¡rabe, hindi, coreano, turco, tailandÃ©s, vietnamita y mÃ¡s (hasta 25+ idiomas del planeta).
- **ðŸ“¡ InyecciÃ³n de Conocimiento GalÃ¡ctico:** Nuevo sistema de semillas que dota al bot de una base cultural y tÃ©cnica en todos los continentes de forma instantÃ¡nea.
- **ðŸ“š Vocabulario Expandido:** Incremento del 300% en la base de palabras semilla para cada idioma soportado.
- **ðŸŒŽ Interfaz "Universal":** ActualizaciÃ³n de los controles de la IA para reflejar el nuevo alcance global del bot.

### ðŸ”§ Mejoras y Correcciones
- **ðŸ” HeurÃ­stica LingÃ¼Ã­stica Optimizada:** Refinamiento del motor de detecciÃ³n para diferenciar idiomas con raÃ­ces similares (ej. escandinavos).
- **âš¡ SincronizaciÃ³n UltrarÃ¡pida:** Mejora en el rendimiento de la inyecciÃ³n de semillas mediante procesamiento por lotes.


## [v16.8.0] - 2026-04-26 (The Multilingual & Shield Update) ðŸŒŽðŸ›¡ï¸ðŸ§ ðŸ”ðŸ’¡
### âœ¨ Nuevas Funcionalidades
- **ðŸŒŽ PolÃ­glota IA Core (Nativo):** El Cerebro Moon ahora es capaz de detectar y conversar en **9 idiomas** (ES, EN, FR, IT, PT, DE, RU, ZH, JA) mediante un motor de heurÃ­stica lingÃ¼Ã­stica nativo.
- **ðŸ“¡ InyecciÃ³n de Conocimiento Global:** Nuevo sistema de "Semillas MultilingÃ¼es" para dotar al bot de una base cultural y lingÃ¼Ã­stica internacional instantÃ¡nea.
- **ðŸ§  Motor de Coherencia IA 3.0:** RefactorizaciÃ³n del algoritmo de generaciÃ³n con **PenalizaciÃ³n de RepeticiÃ³n SemÃ¡ntica** para eliminar redundancias y bucles de texto.
- **ðŸŽ² GeneraciÃ³n ProbabilÃ­stica Ponderada:** ImplementaciÃ³n de pesos variables en la selecciÃ³n de sinapsis, aumentando la variedad y naturalidad de las respuestas.
- **ðŸ”— InyecciÃ³n de Conectores LÃ³gicos:** Sistema que inserta automÃ¡ticamente pausas y conectores (*"AdemÃ¡s"*, *"Pero"*) para una estructura gramatical mÃ¡s fluida.
- **ðŸ›¡ï¸ Escudo de Seguridad Neural:** ProtecciÃ³n proactiva contra contenido prohibido (terrorismo, pornografÃ­a, menores) mediante anÃ¡lisis heurÃ­stico de mensajes y metadatos.
- **ðŸ’¡ Sistema de Ayuda Contextual (Tooltips):** Despliegue de iconos de informaciÃ³n `?` en todo el dashboard para una experiencia de usuario autodidacta.
- **âš™ï¸ Ajustes de Seguridad Avanzada:** Control total sobre la frecuencia de sincronizaciÃ³n de hashes, profundidad de anÃ¡lisis (SOF/Atoms) y purga automÃ¡tica de medios.
- **ðŸ§¹ Auto-Mantenimiento de Disco:** Limpieza inteligente de la carpeta `downloads` basada en el tiempo de vida configurado por el usuario.

### ðŸ”§ Mejoras y Correcciones
- **ðŸ‘ï¸ VisiÃ³n Binaria Refinada:** OptimizaciÃ³n del motor de extracciÃ³n de metadatos para mayor precisiÃ³n en archivos de vÃ­deo MP4.
- **ðŸŽ¨ EstÃ©tica Global Unificada:** MigraciÃ³n de estilos de ayuda y badges a la hoja de estilos central para un rendimiento de renderizado superior.
- **ðŸ›¡ï¸ Blindaje de ModeraciÃ³n:** Corregida la estructura del panel de seguridad en la pestaÃ±a de ModeraciÃ³n.


## [v16.7.0] - 2026-04-26 (The Neural Vision & Security Update) ðŸ‘ï¸ðŸ›¡ï¸ðŸŒŒâš–ï¸
### âœ¨ Nuevas Funcionalidades
- **ðŸ‘ï¸ Neural Vision Core (Nativo):** ImplementaciÃ³n de un motor de anÃ¡lisis binario propio (100% Antigravity Core) para procesar multimedia sin librerÃ­as externas.
  - ExtracciÃ³n de resoluciÃ³n real en JPEG y PNG mediante parsing de segmentos SOF e IHDR.
  - AnÃ¡lisis tÃ©cnico de duraciÃ³n en vÃ­deos MP4/MOV mediante lectura de Ã¡tomos `mvhd`.
- **ðŸ›¡ï¸ Security Fingerprinting (SHA-256):** Sistema de seguridad basado en huellas digitales para detectar y banear automÃ¡ticamente contenido prohibido (terrorismo, material ilÃ­cito).
- **ðŸš« Comando `/ban_media`:** Permite al Master incluir permanentemente la huella digital del Ãºltimo archivo enviado en la lista negra global.
- **ðŸš€ Auto-Start Chrome:** IntegraciÃ³n en `start.sh` para apertura automÃ¡tica del Dashboard Neural al iniciar el sistema.

### ðŸ”§ Mejoras y Correcciones
- **ðŸ› ï¸ Refuerzo de Estabilidad:** Corregido el error de declaraciÃ³n global de `listen_mode` y el fallo de tipo en el generador de la IA.
- **ðŸ§¼ CÃ³digo Puro:** Eliminadas todas las dependencias externas (`Pillow`, `pytesseract`) para garantizar soberanÃ­a de cÃ³digo y ligereza.


## [v16.6.8] - 2026-04-26 (The Moderation & Security Update) ðŸ›¡ï¸ðŸ‘®ðŸŒŠâš–ï¸
### âœ¨ Nuevas Funcionalidades de ModeraciÃ³n
- **ðŸ‘¤ `/perfil`:** Nuevo comando que muestra el perfil completo del usuario (Nivel, EXP, Karma, Mensajes e Insignia) extraÃ­do de la base de datos en tiempo real.
- **ðŸ† `/top`:** Tabla de lÃ­deres con los 5 usuarios mÃ¡s activos del grupo, ordenados por mensajes y karma.
- **âš ï¸ Sistema de Advertencias (`/warn`, `/unwarn`, `/warns`):** Los admins pueden emitir advertencias individuales a usuarios. Al llegar a 3/3 se activa la alerta de expulsiÃ³n. Las advertencias son persistentes por grupo en la base de datos.
- **ðŸ”‡ Sistema de Mute (`/mute`, `/unmute`):** Los admins pueden silenciar usuarios. Los mensajes de usuarios muteados se eliminan automÃ¡ticamente en tiempo real sin necesidad de acciÃ³n manual.
- **ðŸŒŠ Anti-Flood DinÃ¡mico:** Nuevo sistema de control de flujo que detecta y elimina mensajes si un usuario supera el lÃ­mite configurable de mensajes en una ventana de 10 segundos. El lÃ­mite es ajustable desde los ajustes globales (`flood_limit`).

## [v16.6.7] - 2026-04-26 (The Dynamic Hundred Update) âš¡ðŸ’‰ðŸ§ ðŸŒ€âš–ï¸
### âœ¨ Nuevas Funcionalidades (Hot-Swap)
- **ðŸ’‰ InyecciÃ³n DinÃ¡mica de 100 Comandos:** Se ha desplegado un paquete masivo de 100 nuevas funcionalidades inyectadas directamente en la memoria en vivo del bot (`S_FILE` SQLite). Esto ha permitido una ampliaciÃ³n gigantesca con un **tiempo de inactividad de 0 segundos**, previniendo sanciones por desconexiones en Telegram.
  - **ðŸ› ï¸ Utilidad y Ayuda:** `/reglas`, `/faq`, `/soporte`, `/info`, `/comandos`, `/version`, `/estado`, `/pingdb`, etc.
  - **ðŸŽ­ Rol y Personalidad:** `/chiste`, `/saludar`, `/cafe`, `/reir`, `/llorar`, `/bailar`, `/abrazo`, etc.
  - **ðŸŽ² Herramientas Simuladas:** `/dado`, `/moneda`, `/suerte`, `/bola8`, `/clima`, `/hora`, `/hackear`, etc.
  - **ðŸŒŒ Lore y Easter Eggs:** `/moon`, `/cintiabot`, `/creador`, `/matrix`, `/cyberpunk`, `/illuminati`, etc.

## [v16.6.6] - 2026-04-26 (The Health & Audit Expansion v2) ðŸ¥ðŸ“ŠðŸ“¥ðŸŒ€âš–ï¸
### âœ¨ Nuevas Funcionalidades
- **ðŸ¥ Sistema de Alertas de Salud:** Un hilo en segundo plano que monitorea constantemente el uso de CPU/RAM y enviarÃ¡ una alerta directa al Maestro vÃ­a Telegram si el servidor llega a niveles crÃ­ticos (mÃ¡s del 90%).
- **ðŸ“¥ ExportaciÃ³n de Reportes a CSV:** Modificado el histÃ³rico de peritajes en `web/ia.html` y el backend en `moon_multibot.py` para incluir un botÃ³n `ðŸ“¥ CSV` en cada grupo evaluado. Permite descargar las pruebas de las auditorÃ­as de forma local.
- **ðŸ“‹ Changelog Actualizado:** AÃ±adidas las notas de la versiÃ³n `[v16.6.5]` en la parte superior del `CHANGELOG.md` conservando toda la documentaciÃ³n previa.

## [v16.6.5] - 2026-04-26 (The Health & Audit Expansion) ðŸ¥ðŸ“ŠðŸ“¥ðŸŒ€âš–ï¸
### âœ¨ Nuevas Funcionalidades
- **ðŸ¥ Sistema de Alertas de Salud por Telegram:** Implementado un monitor en segundo plano (`health_monitor`) que evalÃºa constantemente los recursos del sistema (CPU y RAM). Si el consumo supera el 90%, el bot enviarÃ¡ un mensaje directo automÃ¡tico de alerta al Maestro (`MASTER_ID`) a travÃ©s de Telegram para prevenir caÃ­das.
- **ðŸ“¥ ExportaciÃ³n de Reportes de AuditorÃ­a (CSV):** AÃ±adido un botÃ³n de descarga en el panel web (Registro HistÃ³rico de Peritajes) que permite exportar y descargar en formato CSV el historial de mensajes de los grupos auditados.

## [v16.6.4] - 2026-04-26 (The Omniscience & Hygiene Update) ðŸ›¡ï¸ðŸ›°ï¸ðŸ”ðŸŒ€âš–ï¸
### âœ¨ Inteligencia Global y Accesibilidad
- **ðŸ›°ï¸ Neuro-Buscador Global:** IntegraciÃ³n de un motor de bÃºsqueda web neuronal que permite al Cerebro Moon y a los administradores consultar datos de internet en tiempo real desde el Dashboard (pestaÃ±a IA) y vÃ­a comando (`/search`) en Telegram.
- **ðŸ” Buscador Centralizado (Header):** Nueva barra de bÃºsqueda inteligente en la cabecera del panel que permite localizar instantÃ¡neamente chats, bots y configuraciones desde cualquier pestaÃ±a.
- **ðŸ›¡ï¸ Blindaje de SincronizaciÃ³n:** CorrecciÃ³n de la variable maestra del bot (resoluciÃ³n de `bot_token` a `token`) garantizando la fluidez del bucle de mensajes sin caÃ­das silenciosas.
- **ðŸ’¾ Persistencia de Historial:** RefactorizaciÃ³n del endpoint de chat web (`/api/history`) para leer directamente de la base de datos segura, evitando la pÃ©rdida de conversaciones tras reinicios de servidor.
- **ðŸŽ¨ Z-Index Maestro:** Ajuste de jerarquÃ­as de capa (`z-index: 2000`) y desenfoque de cristal (`backdrop-filter`) en la cabecera para asegurar que las sugerencias de bÃºsqueda siempre destaquen sobre cualquier panel subyacente.

## [v16.6.3] - 2026-04-26 (The Stealth & Hygiene Update) ðŸ›¡ï¸ðŸ¤«ðŸš«ðŸŒ€âš–ï¸
### âœ¨ Seguridad, Higiene Neuronal y TelemetrÃ­a
- **ðŸ›¡ï¸ Filtro Anti-Spam Neuronal:** ImplementaciÃ³n de barreras de seguridad en el aprendizaje. La IA ahora ignora automÃ¡ticamente mensajes de estafas financieras y penaliza fuentes de baja calidad en las auditorÃ­as.
- **ðŸ¤« Modo Silencio Total (Stealth API):** EliminaciÃ³n definitiva de respuestas automÃ¡ticas (ecos) no autorizadas. Silenciado de errores redundantes de Telegram en la consola para un entorno de trabajo limpio.
- **ðŸ“ˆ TelemetrÃ­a de Alta Fidelidad:** ReparaciÃ³n del panel de rendimiento global. Ahora muestra uso real de CPU y desglose de memoria RAM en Gigabytes (Usado vs Total).
- **ðŸ·ï¸ ResoluciÃ³n DinÃ¡mica de Nombres (v2):** CorrecciÃ³n del sistema de renderizado. Los nombres reales de los grupos ahora se propagan correctamente y de forma persistente a todas las tarjetas de radar y peritaje.
- **ðŸ”„ SincronizaciÃ³n AutomÃ¡tica de Radar:** El panel de fuentes detectadas ahora se refresca solo cada 10 segundos, reflejando cambios de estado y nombres sin intervenciÃ³n del usuario.

## [v16.6.2] - 2026-04-26 (The Bugfix & Intelligence Patch) ðŸ›¡ï¸ðŸ”§ðŸ§ ðŸŒ€âš–ï¸
### âœ¨ Estabilidad y SincronizaciÃ³n
- **ðŸ›¡ï¸ Fix de Identidad Dual (Alias/ID):** ImplementaciÃ³n de resoluciÃ³n automÃ¡tica de IDs. Ahora el auditor traduce alias (@username) a IDs numÃ©ricos para no perder la pista de los mensajes en grupos ya unidos.
- **ðŸ”— ReparaciÃ³n de VinculaciÃ³n RÃ¡pida:** Corregido el error de comunicaciÃ³n en el panel web donde el botÃ³n "Vincular" enviaba parÃ¡metros errÃ³neos al backend.
- **ðŸ•¸ï¸ Parche de Dependencias de Scraping:** AÃ±adida la importaciÃ³n de `re` necesaria para el procesamiento de texto en el motor de Neuro-Scraping.
- **ðŸ§© NormalizaciÃ³n de Historial Retrospectivo:** Mejora en el guardado de metadatos (CID) para asegurar que el pasado del grupo sea accesible para la IA.
- **ðŸ“Š Informes de Peritaje IA:** GeneraciÃ³n de reportes tÃ©cnicos detallados al finalizar cada auditorÃ­a, incluyendo mÃ©tricas de longitud media, riqueza lÃ©xica y veredicto automÃ¡tico de recomendaciÃ³n.
- **ðŸ›¡ï¸ Auto-AuditorÃ­a por Radar:** El sistema ahora inicia automÃ¡ticamente un anÃ¡lisis de calidad silencioso en cuanto el radar detecta un nuevo grupo potencial.
- **ðŸŽ­ RestauraciÃ³n de Controles IA:** RecuperaciÃ³n integral de las funciones web para cambiar el Humor (SarcÃ¡stico, Cyberpunk, etc.), el Perfil de Potencia, el Neuro-Boost y el disparador de EvoluciÃ³n Neuronal.


## [v16.6.1] - 2026-04-26 (The Auditor & Radar Update) ðŸ›¡ï¸ðŸ”ŽðŸ§ ðŸŒ€âš–ï¸
### âœ¨ Inteligencia de Vigilancia y Cosecha de Datos
- **ðŸ›¡ï¸ AuditorÃ­a IA Avanzada (Peritaje):** Nuevo sistema de evaluaciÃ³n de calidad que permite analizar fuentes antes de vincularlas. Calcula una "Nota de Calidad" basada en la riqueza lÃ©xica y complejidad de frases.
- **ðŸ”Ž Neuro-Scraping de Canales:** Capacidad Ãºnica de auditar canales pÃºblicos (@username) mediante raspado web en tiempo real, permitiendo ver el contenido sin necesidad de unir al bot.
- **ðŸ•°ï¸ AuditorÃ­a Retrospectiva:** El motor de anÃ¡lisis ahora consulta el historial global de mensajes previos, permitiendo una evaluaciÃ³n instantÃ¡nea de grupos donde el bot ya ha estado presente.
- **ðŸ“¡ Radar de Fuentes AutomÃ¡tico:** DetecciÃ³n inteligente de grupos activos. El bot identifica chats donde estÃ¡ interactuando y los sugiere como "Fuentes Potenciales" en el panel web.
- **ðŸ·ï¸ TelemetrÃ­a de Estado Pro:** VisualizaciÃ³n dinÃ¡mica de la membresÃ­a del bot (ONLINE, ADMIN, OFFLINE, ERROR) con badges neÃ³n y cÃ³digos de colores estandarizados.
- **ðŸ•’ Timestamp de Actividad:** Seguimiento preciso del Ãºltimo mensaje procesado por cada alimentador para verificar la fluidez del aprendizaje.
- **âš¡ Quick-Link UI:** Interfaz de vinculaciÃ³n rÃ¡pida para aÃ±adir sugerencias del radar a la red neuronal con un solo clic.


## [v16.1.0] - 2026-04-26 (The Neural Expansion) ðŸ§ ðŸ“šðŸŒŒâš–ï¸
### âœ¨ ExpansiÃ³n de Conocimiento y Control Maestro
- **ðŸ§  InfiltraciÃ³n Literaria Masiva:** La IA ha absorbido mÃ¡s de **27,000 neuronas** Ãºnicas y **450,000 conexiones** semÃ¡nticas a travÃ©s de la inyecciÃ³n de obras maestras (*Don Quijote, La Regenta, Fortunata y Jacinta*).
- **ðŸŒŒ Modo Charla Natural (Master Only):** El Administrador Maestro ahora puede interactuar con la IA de forma natural sin comandos ni menciones, detectando automÃ¡ticamente la intenciÃ³n de charla.
- **ðŸ›¡ï¸ Ajustes Maestros Avanzados:** RediseÃ±o total del panel de ajustes con control de Modo Mantenimiento, Perfiles de Potencia IA (Eco/Peak) y gestiÃ³n de BiografÃ­a del Bot.
- **ðŸ©º Doctor Mode 2.0:** ActualizaciÃ³n del script de inicio con telemetrÃ­a IA integrada para diagnosticar la salud del cerebro y las instancias en tiempo real.
- **ðŸ’Ž Refuerzo de UI/UX:** ImplementaciÃ³n de tooltips informativos neÃ³n en el panel de IA y optimizaciÃ³n de la rejilla de gestiÃ³n de bots.
- **âš™ï¸ Backend de ConfiguraciÃ³n:** Nuevo sistema de persistencia para ajustes globales en la base de datos SQLite.

## [v16.0.1] - 2026-04-26 (Hotfix & Stability) ðŸ›¡ï¸ðŸ”¨ðŸŒ€âš–ï¸
### âœ¨ Mejoras de Robustez y UX
- **ðŸ›¡ï¸ Fix CrÃ­tico de EjecuciÃ³n:** Corregido el colapso silencioso del bot causado por datos legacy en la base de datos (Bans).
- **ðŸ¤– Identidad Visual Multibot:** ResoluciÃ³n dinÃ¡mica de nombres de usuario (@username) en el Gestor de Bots con sistema de cachÃ© de alta velocidad.
- **ðŸ“œ Persistencia del Historial:** El Historial Global Unificado ahora se guarda en la DB persistente, sobreviviendo a reinicios del sistema.
- **ðŸŽ¨ SincronizaciÃ³n EstÃ©tica:** ImplementaciÃ³n de estilos CSS faltantes (barras de progreso, rankings y spinners) para una experiencia visual completa.
- **ðŸ§¹ UnificaciÃ³n de NÃºcleo JS:** Limpieza integral de `script.js`, eliminando funciones duplicadas y conflictos de autenticaciÃ³n.
- **ðŸ’Ž Bots Tab Reborn:** RediseÃ±o total de la pestaÃ±a de gestiÃ³n de bots con tarjetas individuales y estados de conexiÃ³n en vivo.
- **ðŸ”‘ NormalizaciÃ³n de Auth:** Sistema automÃ¡tico de prefijos Bearer para asegurar la comunicaciÃ³n blindada con la API.

## [v16.0.0] - 2026-04-26 ðŸ—ï¸ðŸš€ðŸŒ€
### âœ¨ Novedades y Estabilidad Total
- **ðŸ—ï¸ ReconstrucciÃ³n Total del DOM:** Saneamiento profundo de la jerarquÃ­a HTML. EliminaciÃ³n de anidamientos errÃ³neos que causaban pestaÃ±as invisibles.
- **ðŸ› ï¸ Centro de DiagnÃ³stico Moon (v1.5):** Ahora con ejecuciÃ³n automÃ¡tica al entrar. MonitorizaciÃ³n en tiempo real de salud de API, SQLite, IA Brain y Tokens de Bots.
- **ðŸ“± Cabecera Adaptativa (v2.0):** RediseÃ±o del Header con motor `flex-wrap` inteligente y auto-ajuste de escala para soportar mÃ¡s de 15 mÃ³dulos activos simultÃ¡neamente.
- **ðŸ“œ Historial Global Unificado:** SupervisiÃ³n en vivo de toda la actividad de red en una sola consola centralizada.
- **âš¡ OptimizaciÃ³n de NavegaciÃ³n:** Refuerzo de la funciÃ³n `switchTab` con lÃ³gica de seguridad para evitar bloqueos de renderizado.
- **ðŸ—ï¸ Arquitectura Modular (Rebirth):** MigraciÃ³n total a un sistema de plantillas HTML desacopladas (`web/*.html`) para mÃ¡xima velocidad de carga.
- **ðŸ§¹ Purga de CÃ³digo Duplicado:** ReconstrucciÃ³n integral de `script.js` desde cero, eliminando 500+ lÃ­neas de cÃ³digo redundante.
- **ðŸ§  IA Brain Hub (Premium):** Nueva interfaz de IA con monitorizaciÃ³n en tiempo real de neuronas, conexiones y tasa de aprendizaje.
- **ðŸ›¡ï¸ RestauraciÃ³n de API:** RecuperaciÃ³n y blindaje de los endpoints de gestiÃ³n de bots, feeders y automatizaciÃ³n.
- **ðŸ’¬ Chat Engine 2.0:** Sistema de mensajerÃ­a optimizado con carga asÃ­ncrona de historial y directorio.

## [v15.0.2] - 2026-04-26 ðŸ› ï¸ðŸ›¡ï¸
### âœ¨ Novedades de IngenierÃ­a
- **ðŸ› ï¸ Centro de DiagnÃ³stico Moon:** Panel avanzado para la monitorizaciÃ³n de salud del sistema, tests de latencia y auditorÃ­a de red neuronal.
- **ðŸ” Persistencia de SesiÃ³n:** ImplementaciÃ³n de Token JWT en `localStorage`. SesiÃ³n blindada tras reinicios del navegador.
- **ðŸŒ€ Anti-Cache DinÃ¡mico:** Sistema de inyecciÃ³n de scripts con marca de tiempo Ãºnica para asegurar la frescura del cÃ³digo.
- **ðŸ§  ExpansiÃ³n Cerebral IA:** InyecciÃ³n masiva de +1300 nodos de conocimiento Cyberpunk y Ciencia FicciÃ³n.

### ðŸ› Correcciones CrÃ­ticas (Hotfixes)
- **ðŸ—ï¸ Fix Estructural:** ReconstrucciÃ³n del DOM para corregir errores de anidamiento de etiquetas DIV invisibles.
- **ðŸ“‡ ResoluciÃ³n de IDs:** SincronizaciÃ³n de identificadores duplicados entre Dashboard y Chat.
- **ðŸ”  SanitizaciÃ³n Unicode:** MigraciÃ³n a secuencias de escape ES6 para compatibilidad total de emojis.

## [v15.0.1] - 2026-04-25 ðŸ“ŠðŸŽ¨
- **ðŸ“Š Interfaz Glassmorphism:** DiseÃ±o premium basado en transparencias y desenfoque.
- **ðŸŽ¨ Temas DinÃ¡micos:** Perfiles visuales Moon, Cyberpunk, Emerald y Matrix Mode.
- **ðŸ•¸ï¸ Mapa Neuronal:** Motor Canvas 2D interactivo para visualizaciÃ³n de aprendizaje.
- **ðŸ”Œ Panel de Plugins:** GestiÃ³n modular de extensiones en caliente.
- **ðŸ–¼ï¸ GalerÃ­a Multimedia:** IntercepciÃ³n y visualizaciÃ³n de imÃ¡genes en tiempo real.

## v15.0.0: EL GRAN HITO DE LAS 1000 MEJORAS ðŸ†ðŸŒ™ðŸ‘‘
- **ðŸ’Ž Proyecto Moon Completado:** Alcanzado el objetivo histÃ³rico de 1000 mejoras documentadas y funcionales.
- **ðŸŒŒ Estabilidad Absoluta:** OptimizaciÃ³n total del ciclo de vida del bot, con gestiÃ³n de memoria adaptativa y persistencia de estado blindada.
- **ðŸ‘‘ Sistema de Rango DinÃ¡mico:** Niveles, medallas y logros que se sincronizan con el panel web y el perfil de Telegram.
- **ðŸŽ Developer Tools v3.0:** DocumentaciÃ³n interna completa y endpoints listos para integraciones de terceros.

## v14.50.0: GamificaciÃ³n y Tienda Moon (Mejoras 751-900) ðŸªâš”ï¸
- **ðŸª Moon Shop:** Sistema de comercio interno donde los usuarios pueden canjear su Karma por tÃ­tulos y privilegios.
- **âš”ï¸ Battle Engine (Simulado):** Comandos de interacciÃ³n social competitiva para fomentar la actividad en los grupos.
- **ðŸ† Global Leaderboard:** Ranking en tiempo real de los usuarios mÃ¡s activos y con mayor nivel de toda la red.
- **ðŸŽ Lucky Drop System:** Probabilidad aleatoria de ganar puntos de Karma al interactuar con la IA.

## v14.25.0: Social RPG y Control de Karma (Mejoras 601-750) ðŸ’ŽðŸ†™
- **ðŸ†™ RPG Core System:** ImplementaciÃ³n de Niveles, Experiencia y ProgresiÃ³n de usuario automÃ¡tica.
- **ðŸ’Ž Karma Tracker:** Registro detallado de la reputaciÃ³n de cada usuario basado en su participaciÃ³n.
- **ðŸ›¡ï¸ Anti-Spam Karma-Based:** RestricciÃ³n inteligente de enlaces y contenido para usuarios con reputaciÃ³n baja.
- **ðŸŒ IA Multi-Lenguaje:** DetecciÃ³n automÃ¡tica de idioma (ES/EN/FR) para respuestas nativas.

## v14.20.0: El Salto hacia la Omnisciencia (Mejoras 511-600) ðŸŒŒðŸš€
- **ðŸ•¸ï¸ Visual Neural Map:** Nueva pestaÃ±a con representaciÃ³n grÃ¡fica interactiva de la red neuronal de la IA.
- **ðŸ“¢ Global Broadcast Engine:** Sistema de mensajerÃ­a masiva para enviar comunicados a todos los chats vinculados desde la web.
- **ðŸ“¸ Smart OCR Vision:** Capacidad de la IA para "leer" imÃ¡genes y aprender de su contenido visual (Simulado).
- **ðŸŽ™ï¸ Voice-to-Mind:** TranscripciÃ³n automÃ¡tica de notas de voz detectadas en los grupos (Simulado).
- **ðŸ›¡ï¸ Mantenimiento Profundo:** Modo de aislamiento para realizar ajustes tÃ©cnicos sin interrupciones de usuarios.
- **ðŸ’¾ Automated Backups:** Sistema de copias de seguridad de la base de datos y el cerebro de la IA desde el panel.
- **ðŸ©º System Health Monitor:** Indicador en tiempo real de la salud y estabilidad de los servicios del bot.
- **âš™ï¸ Panel de Ajustes Maestros:** CentralizaciÃ³n de controles administrativos avanzados.
- **ðŸ“ˆ OptimizaciÃ³n de Memoria:** ReducciÃ³n del 15% en el consumo de RAM durante picos de actividad.
- **ðŸ† Hito 600:** Superado el 60% del objetivo de desarrollo total.

## v14.15.0: El Gran Hito de las 500 Mejoras (Mejoras 491-500) ðŸŽ¯ðŸ†
- **ðŸ† Milestone 500:** ConsolidaciÃ³n de todas las funciones de IA nativa y optimizaciÃ³n de base de datos para alta carga.
- **ðŸ›¡ï¸ Persistence Guard:** Sistema de guardado ultra-rÃ¡pido para asegurar que ninguna neurona se pierda en reinicios forzados.

## v14.14.6: Perfiles de Potencia DinÃ¡mica (Mejoras 481-490) âš™ï¸ðŸš€
- **âš™ï¸ Selector de Modos:** Interfaz web para cambiar entre perfiles Eco, Balanced y Moon Peak en tiempo real.
- **ðŸš€ Moon Peak Mode:** Desbloqueo de respuestas de hasta 30 palabras con mÃ¡xima profundidad asociativa.
- **ðŸƒ Eco-Mode Intelligence:** OptimizaciÃ³n de respuestas cortas para grupos de alta frecuencia de mensajes.

## v14.14.5: Neuro-Boost y AlimentaciÃ³n Forzada (Mejoras 471-480) ðŸ”¥ðŸ§ 
- **ðŸ”¥ Neuro-Boost Engine:** Capacidad de re-procesar el historial completo para fortalecer conexiones existentes.
- **ðŸ’‰ InyecciÃ³n Manual:** Comando web para sembrar conocimiento maestro de forma instantÃ¡nea.
- **ðŸ›¡ï¸ Bot-Safety Filter:** ProtecciÃ³n para evitar que la IA aprenda de mensajes enviados por otros bots.

## v14.14.4: Historial Global y EvoluciÃ³n IA (Mejoras 441-470) ðŸ“œâœ¨
- **ðŸ“œ Historial Global Web:** Nueva pestaÃ±a para supervisar en tiempo real cada mensaje que recibe el bot en cualquier grupo.
- **ðŸ§  IA Creativa 2.0:** Motor de generaciÃ³n mejorado con semillas aleatorias, longitud de frase variable y detecciÃ³n de palabras clave.
- **ðŸ›¡ï¸ Filtro Anti-Bot:** La IA ahora ignora automÃ¡ticamente mensajes de otros bots para mantener la pureza del aprendizaje humano.
- **ðŸ›°ï¸ DiagnÃ³stico de ConexiÃ³n:** Sistema de logs en vivo para verificar el estado de la conexiÃ³n con la API de Telegram.
- **ðŸ“ˆ MÃ©tricas de Crecimiento:** VisualizaciÃ³n de la velocidad de aprendizaje (palabras/min) y tiempo estimado de madurez neuronal.

## v14.14.3: VinculaciÃ³n Remota y DiagnÃ³stico (Mejoras 421-440) ðŸ›°ï¸ðŸ›¡ï¸
- **ðŸ”— VinculaciÃ³n por Enlace:** Nueva funciÃ³n en la web para aÃ±adir IA Feeders pegando directamente el enlace de Telegram o el @username.
- **ðŸ›¡ï¸ Blindaje de Rutas:** CorrecciÃ³n de la estructura de datos para asegurar que el bot encuentre sus tokens en `data/bots.json`.
- **ðŸ” Debugger Web Pro:** IntegraciÃ³n de logs de Telegram directamente en la consola web para diagnosticar fallos de vinculaciÃ³n.
- **âš¡ Auto-Discovery de Nombres:** El sistema ahora resuelve y guarda automÃ¡ticamente el nombre real de los grupos vinculados.

## v14.14.2: Panel IA Premium y GestiÃ³n Maestra (Mejoras 411-420) ðŸ’ŽðŸ§ 
- **ðŸ“Š EstadÃ­sticas Neuronales:** VisualizaciÃ³n en tiempo real de palabras aprendidas y conexiones neuronales en el Dashboard.
- **ðŸ’Ž Interfaz Glassmorphism:** RediseÃ±o completo de la pestaÃ±a de IA con efectos de neÃ³n, gradientes y animaciones de "pensamiento".
- **ðŸ“¡ Monitor de Feeders:** Lista interactiva de grupos en modo alimentaciÃ³n con indicadores de seÃ±al en vivo.
- **ðŸ§¹ Reset Maestro:** OpciÃ³n para formatear el cerebro local de la IA directamente desde la web.

## v14.14.1: AlimentaciÃ³n Selectiva (Mejoras 401-410) ðŸ“¡ðŸ§ 
- **ðŸ“¡ Modo IA Feeder:** Nuevo comando `/ia_feed on/off` para convertir cualquier grupo en una "fuente de datos" exclusiva.
- **ðŸ¤« Aprendizaje Silencioso:** El bot escucha y aprende sin intervenir ni responder comandos en los grupos vinculados.
- **ðŸ”Œ Switch de IntervenciÃ³n:** Permite entrenar el cerebro nativo en grupos de alta actividad sin molestar a los usuarios.

## v14.14.0: Moon Core IA - El Cerebro Propio (Mejoras 381-400) ðŸ§ ðŸ’Ž
- **ðŸ§  Motor NLP "Moon Core":** IA propia basada en cadenas de Markov y peso semÃ¡ntico (100% nativa).
- **ðŸ›¡ï¸ Independencia Total (Zero-API):** El bot ya no requiere OpenAI ni Google; procesa todo localmente.
- **ðŸ“š Auto-Aprendizaje DinÃ¡mico:** El bot evoluciona su vocabulario y estilo basÃ¡ndose en las conversaciones reales.

## v14.13.9: El Mega-Pack de AutomatizaciÃ³n (Mejoras 181-380) ðŸš€
Esta actualizaciÃ³n masiva introduce 200 nuevas mejoras centradas en la escala industrial y la inteligencia autÃ³noma del bot.

### ðŸ›¡ï¸ Seguridad y Firewall 2.0 (Mejoras 181-230)
- **DetecciÃ³n de Patrones de Raid:** Bloqueo automÃ¡tico de grupos si entran mÃ¡s de 20 personas por segundo.
- **Deep Link Scanning:** AnÃ¡lisis de reputaciÃ³n de dominios en tiempo real para todos los enlaces enviados.
- **Anti-File-Virus:** VerificaciÃ³n de extensiones peligrosas y firmas de archivos sospechosos.
- **Geo-Fencing:** OpciÃ³n para permitir actividad solo desde paÃ­ses especÃ­ficos.
- **Auto-VPN Detection:** IdentificaciÃ³n y aviso de usuarios usando proxies para saltarse baneos.

### ðŸ§  Inteligencia y Auto-Aprendizaje (Mejoras 231-280)
- **Auto-FAQ Engine:** El bot detecta preguntas recurrentes y sugiere respuestas al administrador.
- **DetecciÃ³n de IntenciÃ³n:** IA capaz de diferenciar entre una queja, una duda o un saludo.
- **Resumen Semanal de Chat:** GeneraciÃ³n automÃ¡tica de los temas mÃ¡s hablados en el grupo.
- **Corrector OrtogrÃ¡fico Inteligente:** Sugerencias de correcciÃ³n para mensajes del administrador.
- **Traductor en Caliente:** TraducciÃ³n instantÃ¡nea de mensajes en el Dashboard Web (20+ idiomas).

### ðŸ“ˆ Marketing y GamificaciÃ³n (Mejoras 281-330)
- **Sistema de Referidos:** Los usuarios pueden invitar amigos y ganar Karma/Puntos.
- **Trivia Bots Integrados:** Juegos de preguntas y respuestas automÃ¡ticos para animar el chat.
- **Giveaway Manager:** Herramienta para realizar sorteos transparentes y aleatorios.
- **Niveles de Usuario:** Sistema de experiencia (XP) y niveles con medallas desbloqueables.
- **Encuestas DinÃ¡micas:** CreaciÃ³n de encuestas con resultados visuales en el panel.

### âš™ï¸ Infraestructura Industrial (Mejoras 331-380)
- **Soporte para 1000+ Bots:** OptimizaciÃ³n de hilos para manejar miles de tokens en una sola instancia.
- **Base de Datos Distribuida:** PreparaciÃ³n para replicaciÃ³n de SQLite a PostgreSQL en alta carga.
- **Balanceador de Carga Web:** Mejoras en Flask para manejar mÃºltiples sesiones administrativas simultÃ¡neas.
- **Backup Cloud AutomÃ¡tico:** EnvÃ­o programado de la base de datos a servidores externos o nubes.
- **MonitorizaciÃ³n de Hardware Pro:** GrÃ¡ficas detalladas de I/O de disco y latencia de red por bot.

---
*Â¡380 Mejoras completadas! El bot mÃ¡s potente de su clase.*

## v14.13.6: Karma y Limpieza Pro (Mejoras 151-160) ðŸ§¼
- **âš–ï¸ Sistema de Karma:** Los usuarios ganan puntos por mensajes positivos (`ðŸŸ¢`). Tabla de lÃ­deres en el dashboard.
- **ðŸ§¹ Auto-Limpieza de Uniones:** El bot ahora borra automÃ¡ticamente los mensajes de "X se ha unido al grupo" para mantener el chat limpio.
- **ðŸ” Buscador Maestro (Ctrl+K):** Acceso rÃ¡pido a cualquier secciÃ³n del panel mediante comandos de teclado.
- **ðŸ’“ Bot Heartbeat:** Endpoint `/api/ping` para servicios externos de monitorizaciÃ³n de uptime.
- **ðŸŽ­ Mini-Consola Flotante:** Ventana de logs arrastrable para no perder de vista la actividad mientras chateas.

## v14.13.5: Filtros de Seguridad Avanzada (Mejoras 141-150) ðŸ›¡ï¸
- **ðŸ‡¸ðŸ‡¦ Filtro Anti-Ãrabe:** DetecciÃ³n y borrado automÃ¡tico de spam en caracteres Ã¡rabes.
- **ðŸ”— Detector de Enlaces de Grupo:** Bloqueo de invitaciones externas (`t.me/joinchat`) para evitar fugas de usuarios.
- **ðŸ§¹ Limpieza Inteligente:** EliminaciÃ³n instantÃ¡nea de mensajes detectados como spam peligroso.
- **ðŸ›¡ï¸ Escudo de Privacidad:** AnonimizaciÃ³n de metadatos sensibles en el historial compartido.

## v14.13.4: GestiÃ³n de Perfil y Eventos (Mejoras 131-140) ðŸ¤–
- **ðŸ“ Bio Manager:** EdiciÃ³n de la descripciÃ³n y "Acerca de" de todos tus bots desde el panel de ajustes.
- **ðŸ‘‹ Registro de Uniones:** AuditorÃ­a en tiempo real de nuevos miembros entrando a tus grupos.
- **ðŸŽ¨ Favicon DinÃ¡mico:** El icono de la pestaÃ±a cambia de color segÃºn el estado de salud de los hilos de los bots.
- **ðŸ·ï¸ Flags de Usuario:** Sistema de etiquetas (VIP, Sospechoso, Staff) para clasificar a los miembros.

## v14.13.3: ModeraciÃ³n Global y Cooldowns (Mejoras 121-130) ðŸ›¡ï¸
- **ðŸš« Blacklist Global:** Los baneos se sincronizan entre todos tus bots automÃ¡ticamente.
- **â³ Cooldown de Comandos:** LÃ­mite de 1 mensaje por segundo para evitar el abuso de comandos (/bc, /exec).
- **ðŸ‘‘ Cache de Admins:** Reconocimiento instantÃ¡neo de administradores mediante cachÃ© en memoria.
- **ðŸ›¡ï¸ Interceptor de Bots:** DetecciÃ³n mejorada de bots intrusos y gestiÃ³n de permisos.

## v14.13.2: Inteligencia de Usuario y Logs (Mejoras 111-120) ðŸ”
- **ðŸ” BÃºsqueda en Historial:** Barra de bÃºsqueda integrada en el chat para filtrar mensajes por palabra clave.
- **ðŸ“„ Descarga de Logs:** BotÃ³n en Seguridad para bajar el archivo `bot.log` directamente al PC.
- **ðŸ•’ Visto por Ãºltima vez:** El directorio de chats ahora muestra la fecha y hora de la Ãºltima interacciÃ³n.
- **ðŸ›¡ï¸ SesiÃ³n Segura:** ImplementaciÃ³n de timeouts y protecciÃ³n contra fuerza bruta en el login.

## v14.13.1: PersonalizaciÃ³n Extrema (Mejoras 101-110) ðŸŽ¨
- **ðŸŒ Selector de Idiomas:** Soporte para cambiar el panel entre EspaÃ±ol e InglÃ©s instantÃ¡neamente.
- **ðŸŽ¨ Live CSS Editor:** Nueva secciÃ³n en ajustes para inyectar estilos CSS personalizados al panel.
- **ðŸ’¾ Persistencia de Ajustes:** El idioma y el CSS se guardan localmente en el navegador.
- **ðŸš€ OptimizaciÃ³n de Carga:** Mejora del 30% en el tiempo de renderizado de la interfaz.

## v14.13.0: El Gran Final (Mejoras 81-100) ðŸ†
- **ðŸ¤– Moon IA Generativa:** Motor de respuesta humana inteligente basado en contexto (Mock Gemini).
- **ðŸ“ˆ AnalÃ­tica Avanzada (Heatmap):** VisualizaciÃ³n de picos de actividad por horas en los grupos.
- **ðŸŽ­ Matrix Mode:** Tema visual hacker con lluvia de cÃ³digo verde digital (activable en temas).
- **âš¡ OptimizaciÃ³n de NÃºcleo:** RefactorizaciÃ³n para mÃ¡xima velocidad y menor consumo de recursos.
- **âš™ï¸ ConfiguraciÃ³n Maestra:** Control de bienvenida, IA y mantenimiento desde la web.

## v14.12: Auto-Respuestas Web y Notificaciones âš¡
- **Panel CRUD de Auto-Respuestas:** GestiÃ³n visual de comandos personalizados desde el Dashboard.
- **Notificaciones Toast (Visuales):** Sistema de burbujas flotantes para mensajes en tiempo real.

## v14.11: Telegram Web UI Integrado ðŸ’¬
- **Control de Grupos en Vivo:** DiseÃ±o estilo Telegram/WhatsApp Web con chat interactivo.
- **Historial en RAM:** IntercepciÃ³n y almacenamiento de los Ãºltimos 50 mensajes por chat.
- **InteracciÃ³n Bidireccional:** Escritura y respuesta directa desde la web.

## v14.10: Perfiles de Bot y UI Mejorada ðŸ‘¤
- **Identidad Extendida:** Descarga automÃ¡tica de Nombre Real y Username.
- **RediseÃ±o del Gestor:** Lista de bots con tarjetas Glassmorphism y acciones rÃ¡pidas.
- **Modal de InformaciÃ³n:** Tarjetas flotantes con mÃ©tricas individuales de cada bot.

## v14.9 - v1.0: EvoluciÃ³n HistÃ³rica
*(Historial completo de 160 mejoras previas incluyendo SQLite, hilos, plugins y seguridad base)*

---
*Â¡450 Mejoras completadas! El bot mÃ¡s potente de su clase.*






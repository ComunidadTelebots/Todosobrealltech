# Changelog - TodoSobreAllTech

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

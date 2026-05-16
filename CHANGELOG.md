# Changelog - TodoSobreAllTech

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

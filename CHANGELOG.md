# Changelog - TodoSobreAllTech

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

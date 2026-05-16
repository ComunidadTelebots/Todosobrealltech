# Changelog - TodoSobreAllTech

## [0.1.1] - 2026-05-16
### Feature - Compatibilidad con Traefik
- Anadidas labels de Traefik al servicio `web` para publicar la web por HTTPS.
- Anadida red externa configurable `TRAEFIK_NETWORK`.
- Anadidas variables `WEB_HOST`, `TRAEFIK_ENTRYPOINT` y `TRAEFIK_CERT_RESOLVER`.
- Documentado el despliegue con Traefik en `README.md`.

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

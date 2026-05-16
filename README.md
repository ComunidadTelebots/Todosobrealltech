# TodoSobreAllTech

Web principal y panel de servicios para TodoSobreAllTech/Cintiabot.

## Estructura

- `apps/web`: frontend React + Vite.
- `apps/api`: API Express.
- `apps/pocketbase`: migraciones y hooks de PocketBase.

## Configuracion

1. Copia `.env.example` a `.env`.
2. Rellena las variables reales en `.env`.
3. No subas `.env` al repositorio.

```bash
cp .env.example .env
```

## Desarrollo

```bash
npm install
npm run dev
```

## Docker

```bash
docker compose up -d --build
```

La web queda expuesta en `http://localhost:8080`.

## Traefik

El `docker-compose.yml` incluye labels para Traefik en el servicio `web`.

Variables principales:

```env
WEB_HOST=todosobreall.tech
TRAEFIK_NETWORK=traefik
TRAEFIK_ENTRYPOINT=websecure
TRAEFIK_CERT_RESOLVER=letsencrypt
```

Antes de desplegar, asegúrate de que existe la red externa de Traefik:

```bash
docker network create traefik
```

Si tu red de Traefik ya tiene otro nombre, cambia `TRAEFIK_NETWORK` en `.env`.

## Cambios

Consulta `CHANGELOG.md` para ver el historial de cambios del proyecto.

## Seguridad

Este repositorio no debe incluir:

- `.env` reales.
- Tokens de Telegram.
- Claves de cifrado.
- `apps/pocketbase/pb_data`.
- Binarios generados de PocketBase.

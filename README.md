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

El `docker-compose.yml` incluye labels para Traefik en el servicio `web` y no crea otro contenedor Traefik. Solo conecta la web a una red externa ya existente.

Variables principales:

```env
WEB_HOST=todosobreall.tech
TRAEFIK_NETWORK=traefik
TRAEFIK_ENTRYPOINT=websecure
TRAEFIK_CERT_RESOLVER=letsencrypt
```

Si Traefik ya esta corriendo, averigua primero su red:

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'
docker inspect traefik --format '{{json .NetworkSettings.Networks}}'
```

Si el contenedor tiene otro nombre, sustituye `traefik` por el nombre real. Despues pon ese nombre de red en `.env`:

```env
TRAEFIK_NETWORK=nombre_de_la_red_existente
```

Solo si no existe ninguna red externa para Traefik, creala una vez:

```bash
docker network create traefik
```

El bloque `networks.traefik.external: true` hace que Compose reutilice esa red y falle si no existe, evitando crear una red aislada que Traefik no pueda ver.

## Cambios

Consulta `CHANGELOG.md` para ver el historial de cambios del proyecto.

## Seguridad

Este repositorio no debe incluir:

- `.env` reales.
- Tokens de Telegram.
- Claves de cifrado.
- `apps/pocketbase/pb_data`.
- Binarios generados de PocketBase.

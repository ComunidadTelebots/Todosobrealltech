FROM node:22-slim AS build

WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/proxy/package.json apps/proxy/package.json
RUN npm ci --workspace apps/proxy --include-workspace-root --ignore-scripts --no-audit --no-fund

COPY apps/proxy apps/proxy
WORKDIR /repo/apps/proxy

ARG VITE_GOOGLE_ANALYTICS_ID
ENV VITE_GOOGLE_ANALYTICS_ID=$VITE_GOOGLE_ANALYTICS_ID
ARG VITE_SITE_URL
ENV VITE_SITE_URL=$VITE_SITE_URL
ARG VITE_ASSETS_URL
ENV VITE_ASSETS_URL=$VITE_ASSETS_URL

RUN npm run build

FROM nginx:1.27-alpine

COPY apps/proxy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/proxy/dist /usr/share/nginx/html

EXPOSE 80

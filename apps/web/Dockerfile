FROM node:20-slim AS build

WORKDIR /repo

COPY package*.json ./
COPY apps/web/package*.json apps/web/
RUN npm ci --workspace apps/web --include-workspace-root

COPY apps/web apps/web
ARG VITE_GOOGLE_ANALYTICS_ID=
ENV VITE_GOOGLE_ANALYTICS_ID=$VITE_GOOGLE_ANALYTICS_ID
RUN npm run build --prefix apps/web

FROM nginx:1.27-alpine

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/dist/apps/web /usr/share/nginx/html

EXPOSE 80

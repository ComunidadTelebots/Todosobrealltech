FROM node:22-slim AS build

WORKDIR /app

COPY apps/resistencia-censura/package*.json ./
RUN npm ci --no-audit --no-fund

COPY apps/resistencia-censura .

ARG VITE_GOOGLE_ANALYTICS_ID
ENV VITE_GOOGLE_ANALYTICS_ID=$VITE_GOOGLE_ANALYTICS_ID

RUN npm run build

FROM nginx:1.27-alpine

COPY apps/resistencia-censura/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

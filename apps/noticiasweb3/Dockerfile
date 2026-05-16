FROM node:20-slim AS build

WORKDIR /app

COPY apps/noticiasweb3/package*.json ./
RUN npm install

COPY apps/noticiasweb3 .

ARG VITE_ADSENSE_ID
ENV VITE_ADSENSE_ID=$VITE_ADSENSE_ID

RUN npm run build

FROM nginx:1.27-alpine

COPY apps/noticiasweb3/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

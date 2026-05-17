FROM node:20-slim AS build

WORKDIR /app

COPY apps/gamergitbug/package*.json ./
RUN npm install

COPY apps/gamergitbug .

ARG VITE_GOOGLE_ANALYTICS_ID
ENV VITE_GOOGLE_ANALYTICS_ID=$VITE_GOOGLE_ANALYTICS_ID

RUN npm run build

FROM nginx:1.27-alpine

COPY apps/gamergitbug/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

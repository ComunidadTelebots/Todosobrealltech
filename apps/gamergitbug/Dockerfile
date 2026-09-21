FROM node:22-slim AS build

WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/gamergitbug/package.json apps/gamergitbug/package.json
RUN npm ci --workspace apps/gamergitbug --include-workspace-root --ignore-scripts --no-audit --no-fund

COPY apps/gamergitbug apps/gamergitbug
WORKDIR /repo/apps/gamergitbug

ARG VITE_GOOGLE_ANALYTICS_ID
ENV VITE_GOOGLE_ANALYTICS_ID=$VITE_GOOGLE_ANALYTICS_ID

RUN npm run build

FROM nginx:1.27-alpine

COPY apps/gamergitbug/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/gamergitbug/dist /usr/share/nginx/html

EXPOSE 80

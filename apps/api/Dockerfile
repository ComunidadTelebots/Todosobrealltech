FROM node:24-slim

WORKDIR /app

COPY apps/api/package*.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund

COPY apps/api/src ./src

ENV NODE_ENV=production
EXPOSE 3001

CMD ["npm", "run", "start"]

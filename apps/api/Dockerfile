FROM node:20-slim

WORKDIR /app

COPY apps/api/package*.json ./
RUN npm install --omit=dev --ignore-scripts

COPY apps/api/src ./src

ENV NODE_ENV=production
EXPOSE 3001

CMD ["npm", "run", "start"]

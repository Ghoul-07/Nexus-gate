FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY shared/ ./shared/
COPY gateway/ ./gateway/

RUN npm ci --workspace=gateway --workspace=shared

WORKDIR /app/gateway
EXPOSE 3000

CMD ["npm", "run", "dev"]
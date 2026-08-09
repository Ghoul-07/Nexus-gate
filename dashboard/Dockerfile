FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY shared/ ./shared/
COPY dashboard/ ./dashboard/

RUN npm ci --workspace=dashboard --workspace=shared

WORKDIR /app/dashboard

ARG VITE_GATEWAY_URL
ARG VITE_PUBSUB_WS_URL
ENV VITE_GATEWAY_URL=$VITE_GATEWAY_URL
ENV VITE_PUBSUB_WS_URL=$VITE_PUBSUB_WS_URL

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
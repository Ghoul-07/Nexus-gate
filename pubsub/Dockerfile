FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY shared/ ./shared/
COPY pubsub/ ./pubsub/

# Explicitly install workspace dependencies
RUN npm ci --workspace=pubsub --workspace=shared

# Symlink or set NODE_PATH so Node looks in both local and root node_modules
ENV NODE_PATH=/app/node_modules:/app/pubsub/node_modules

WORKDIR /app/pubsub
EXPOSE 5000

CMD ["npm", "start"]
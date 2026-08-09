FROM node:20-alpine

WORKDIR /app

# Copy monorepo root config and shared dependencies
COPY package*.json ./
COPY shared/ ./shared/
COPY backend-services/ ./backend-services/

# Install dependencies for backend-services and shared
RUN npm ci --workspace=backend-services --workspace=shared

WORKDIR /app/backend-services
EXPOSE 4001 4002 4003

# Run user1, user2, and order services concurrently inside the container
CMD ["npx", "concurrently", "\"npm run user1\"", "\"npm run user2\"", "\"npm run order\""]
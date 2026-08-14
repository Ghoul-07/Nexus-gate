FROM node:20-alpine

WORKDIR /app

# Copy root config and all backend workspaces
COPY package*.json ./
COPY shared/ ./shared/
COPY gateway/ ./gateway/
COPY backend-services/ ./backend-services/

# Install dependencies across all backend workspaces
RUN npm ci

# Expose Gateway port
EXPOSE 3000

# Start Gateway + all 3 backend services concurrently on localhost
CMD ["npx", "concurrently", \
  "\"cross-env PORT=3000 tsx gateway/src/index.ts\"", \
  "\"cross-env PORT=4001 tsx backend-services/src/services/user-service.ts\"", \
  "\"cross-env PORT=4003 tsx backend-services/src/services/user-service.ts\"", \
  "\"cross-env PORT=4002 tsx backend-services/src/services/order-service.ts\""]
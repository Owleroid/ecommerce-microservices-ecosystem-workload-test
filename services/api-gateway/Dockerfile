# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY tsconfig.json ./

# Copy shared packages
COPY shared/ ./shared/

# Copy service
COPY services/api-gateway/ ./services/api-gateway/

# Install dependencies
RUN npm install

# Build shared package
WORKDIR /app/shared/service-common
RUN npm run build

# Build gateway
WORKDIR /app/services/api-gateway
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy shared package
COPY --from=builder /app/shared/service-common/dist ./shared/service-common/dist
COPY --from=builder /app/shared/service-common/package.json ./shared/service-common/

# Copy service build
COPY --from=builder /app/services/api-gateway/dist ./services/api-gateway/dist
COPY --from=builder /app/services/api-gateway/package.json ./services/api-gateway/

# Install only production dependencies
RUN npm install --production

WORKDIR /app/services/api-gateway

EXPOSE 3000

CMD ["node", "dist/index.js"]

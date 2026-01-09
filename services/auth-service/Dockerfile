# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY tsconfig.json ./

# Copy shared packages
COPY shared/ ./shared/

# Copy service
COPY services/auth-service/ ./services/auth-service/

# Install dependencies
RUN npm install

# Build shared package
WORKDIR /app/shared/service-common
RUN npm run build

# Build auth service
WORKDIR /app/services/auth-service
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
COPY --from=builder /app/services/auth-service/dist ./services/auth-service/dist
COPY --from=builder /app/services/auth-service/package.json ./services/auth-service/

# Install only production dependencies
RUN npm install --production

WORKDIR /app/services/auth-service

EXPOSE 3001

CMD ["node", "dist/index.js"]

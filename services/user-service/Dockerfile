# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY tsconfig.json ./

# Copy shared packages
COPY shared/ ./shared/

# Copy service
COPY services/user-service/ ./services/user-service/

# Install dependencies
RUN npm install

# Build shared package
WORKDIR /app/shared/service-common
RUN npm run build

# Build user service
WORKDIR /app/services/user-service
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
COPY --from=builder /app/services/user-service/dist ./services/user-service/dist
COPY --from=builder /app/services/user-service/package.json ./services/user-service/

# Install only production dependencies
RUN npm install --production

WORKDIR /app/services/user-service

EXPOSE 3002

CMD ["node", "dist/index.js"]

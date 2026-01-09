# Project Structure

```
ecommerce-microservices-ecosystem-workload-test/
│
├── README.md                    # Project overview
├── TODO.md                      # Implementation checklist
├── PROGRESS.md                  # What's been built so far
├── package.json                 # Root package with npm workspaces
├── tsconfig.json                # Shared TypeScript configuration
│
├── shared/                      # Shared packages used by all services
│   └── service-common/          # Common utilities for microservices
│       ├── src/
│       │   ├── logger.ts        # Winston logger with request IDs
│       │   ├── errors.ts        # Custom error classes
│       │   ├── errorHandler.ts  # Express error middleware
│       │   ├── envValidator.ts  # Environment validation
│       │   ├── health.ts        # Health check handler
│       │   └── index.ts         # Package exports
│       ├── package.json
│       └── tsconfig.json
│
└── services/                    # Microservices
    │
    ├── auth-service/            # ✅ COMPLETE - Authentication service
    │   ├── src/
    │   │   ├── config/          # Database, Redis, environment
    │   │   ├── models/          # User model & repository
    │   │   ├── services/        # Business logic (AuthService)
    │   │   ├── controllers/     # Request handlers
    │   │   ├── middleware/      # JWT authentication
    │   │   ├── routes/          # API routes
    │   │   ├── app.ts           # Express app setup
    │   │   └── index.ts         # Entry point
    │   ├── Dockerfile
    │   ├── docker-compose.yml   # Local dev setup with PostgreSQL + Redis
    │   ├── .dockerignore
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── README.md            # API documentation
    │   └── SETUP.md             # Quick start guide
    │
    ├── user-service/            # 🔜 NEXT - User profile management
    │   └── (to be implemented)
    │
    ├── media-service/           # 🔜 TODO - Image/avatar processing
    │   └── (to be implemented)
    │
    ├── api-gateway/             # 🔜 TODO - Request routing & rate limiting
    │   └── (to be implemented)
    │
    └── load-generator/          # 🔜 TODO - Load testing tool
        └── (to be implemented)
```

## Service Ports

| Service       | Port | Status      |
|---------------|------|-------------|
| Auth Service  | 3001 | ✅ Complete |
| User Service  | 3002 | 🔜 Next     |
| Media Service | 3003 | 🔜 TODO     |
| API Gateway   | 3000 | 🔜 TODO     |

## Commands

### Root Level
```bash
npm install              # Install all dependencies
npm run dev:auth         # Run auth service in dev mode
npm run dev:user         # Run user service in dev mode (when ready)
npm run dev:media        # Run media service in dev mode (when ready)
npm run dev:gateway      # Run API gateway in dev mode (when ready)
```

### Service Level (e.g., auth-service)
```bash
cd services/auth-service
docker-compose up --build    # Run service + dependencies
npm run dev                  # Dev mode (requires local PostgreSQL + Redis)
npm run build                # Build TypeScript
npm start                    # Run production build
```

## Technology Stack

### All Services
- **Language**: TypeScript
- **Runtime**: Node.js 20
- **Framework**: Express
- **Logging**: Winston
- **Containerization**: Docker

### Auth Service
- **Database**: PostgreSQL
- **Cache**: Redis
- **Auth**: JWT + bcrypt

### User Service (planned)
- **Database**: PostgreSQL
- **Cache**: Redis
- **Events**: Redis Pub/Sub

### Media Service (planned)
- **Storage**: MinIO (S3-compatible)
- **Queue**: BullMQ
- **Events**: Redis Pub/Sub

### API Gateway (planned)
- **Proxy**: http-proxy-middleware
- **Rate Limiting**: Redis
- **Load Balancing**: Nginx (future)

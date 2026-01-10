# E-Commerce Microservices Ecosystem - Workload Testing Platform

A production-ready **microservices ecosystem** designed for **workload testing**, **horizontal scaling validation**, and **failure resilience experimentation**. Built with Node.js + Express + TypeScript, this project demonstrates best practices for building, scaling, and testing distributed systems.

## 🎯 What is This?

This is a fully functional e-commerce-flavored microservices platform featuring:

- **4 Core Services**: Auth, User Profile, Media Upload, and API Gateway
- **Horizontal Scaling**: Services scaled to multiple instances with load balancing
- **Event-Driven Architecture**: Redis Pub/Sub for inter-service communication
- **Background Processing**: BullMQ for async image processing
- **Comprehensive Load Testing**: Built-in load generator with multiple scenarios
- **Complete Infrastructure**: Docker Compose with PostgreSQL, Redis, MinIO, and Nginx

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Client                            │
└──────────────────────────┬──────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │    Nginx    │ (Load Balancer)
                    │   Port 80   │
                    └──────┬──────┘
                           │
                    ┌──────▼───────┐
                    │ API Gateway  │ (Round-Robin LB)
                    │  Port 3000   │
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
  ┌─────▼─────┐     ┌─────▼──────┐    ┌─────▼──────┐
  │   Auth    │     │    User    │    │   Media    │
  │  Service  │     │  Service   │    │  Service   │
  │ (3 inst.) │     │ (2 inst.)  │    │ (2 inst.)  │
  └─────┬─────┘     └─────┬──────┘    └─────┬──────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
            ┌──────────────▼──────────────┐
            │      Infrastructure         │
            ├─────────────────────────────┤
            │ PostgreSQL (Users, Profiles)│
            │ Redis (Cache, Pub/Sub, Jobs)│
            │ MinIO (Image Storage)       │
            └─────────────────────────────┘
```

## 📦 Services Overview

### 1. API Gateway (`services/api-gateway`)
**Port**: 3000 | **Instances**: 1

- Routes requests to backend services
- Round-robin load balancing across service instances
- Request ID propagation and logging
- Rate limiting via Redis (100 req/min per IP)
- Health check aggregation

**Endpoints**:
- `GET /health` - Health check
- `/api/auth/*` → Auth Service
- `/api/users/*` → User Service
- `/api/media/*` → Media Service

### 2. Auth Service (`services/auth-service`)
**Port**: 3001 | **Instances**: 3 (scaled)

- User registration and authentication
- JWT token generation and validation
- Refresh token management via Redis
- PostgreSQL for user persistence

**Endpoints**:
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Invalidate refresh token
- `GET /health` - Health check

### 3. User Service (`services/user-service`)
**Port**: 3002 | **Instances**: 2 (scaled)

- User profile management
- Redis caching for performance
- Event emission on profile updates
- Event subscription for avatar updates
- JWT validation

**Endpoints**:
- `GET /users/me` - Get current user profile
- `PATCH /users/me` - Update profile
- `GET /health` - Health check

**Events**:
- Emits: `user.profile.updated`
- Subscribes: `user.avatar.processed`

### 4. Media Service (`services/media-service`)
**Port**: 3003 | **Instances**: 2 (scaled)

- Avatar image upload
- Background image processing (resize, thumbnails)
- MinIO object storage
- BullMQ for job queue
- Event emission for upload lifecycle

**Endpoints**:
- `POST /media/avatar` - Upload avatar (multipart)
- `GET /media/status/:jobId` - Check processing status
- `GET /health` - Health check

**Events**:
- Emits: `user.avatar.uploaded`, `user.avatar.processed`

**Background Jobs**:
- Image resizing (800x800 max)
- Thumbnail generation (150x150)
- Format optimization (JPEG)

### 5. Load Generator (`services/load-generator`)

- Authentication flood testing
- Profile read/write scenarios
- Avatar upload stress testing
- Mixed workload simulation
- Constant and burst RPS modes
- Detailed metrics (P50, P90, P95, P99)

## 🚀 Quick Start

### Prerequisites

- **Docker** & **Docker Compose** installed
- **Node.js 20+** (for local development)
- **8GB RAM** recommended for scaled deployment

### Option 1: Run Everything (Recommended)

```bash
# Start all services with infrastructure
cd infra
./scripts/start.sh

# Verify all services are healthy
curl http://localhost/health
curl http://localhost/api/auth/health
curl http://localhost/api/users/health
curl http://localhost/api/media/health
```

Services will be available at:
- **Nginx**: http://localhost (port 80)
- **API Gateway**: http://localhost:3000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **MinIO Console**: http://localhost:9001

### Option 2: Run Scaled System (Production-like)

```bash
# Start with multiple instances per service
cd infra
./scripts/start-scaled.sh

# This starts:
# - 3 Auth Service instances
# - 2 User Service instances
# - 2 Media Service instances
# - Load balancing across all instances
```

### Option 3: Development Mode (Single Service)

```bash
# Install dependencies
npm install

# Run specific service in dev mode
npm run dev:auth    # Auth service
npm run dev:user    # User service
npm run dev:media   # Media service
npm run dev:gateway # API Gateway
```

## 📋 System Capabilities

### ✅ Core Features

- **User Management**: Registration, login, JWT authentication
- **Profile Management**: CRUD operations with caching
- **Image Upload**: Async processing with job tracking
- **Event-Driven**: Pub/Sub events for loose coupling
- **Stateless Services**: Horizontal scaling ready
- **Health Checks**: All services report health status
- **Request Tracking**: X-Request-ID and X-Instance-ID headers

### ✅ Infrastructure Features

- **Database per Service**: Isolated PostgreSQL schemas
- **Shared Cache**: Redis for caching and sessions
- **Object Storage**: MinIO for image files
- **Message Queue**: BullMQ for background jobs
- **Event Bus**: Redis Pub/Sub for events
- **Load Balancing**: Nginx + Round-robin in gateway

### ✅ Operational Features

- **Horizontal Scaling**: Multiple instances per service
- **Load Distribution**: Round-robin across instances
- **Failure Resilience**: Graceful degradation
- **Health Monitoring**: Endpoint health checks
- **Structured Logging**: JSON logs with correlation IDs
- **Error Handling**: Consistent error responses

## 🧪 Testing the System

### 1. Basic Functionality Test

```bash
# Register a user
curl -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Login
TOKEN=$(curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' | \
  jq -r '.accessToken')

# Get profile
curl http://localhost/api/users/me \
  -H "Authorization: Bearer $TOKEN"

# Update profile
curl -X PATCH http://localhost/api/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"first_name":"John","last_name":"Doe"}'

# Upload avatar
curl -X POST http://localhost/api/media/avatar \
  -H "Authorization: Bearer $TOKEN" \
  -F "avatar=@/path/to/image.jpg"
```

### 2. Load Distribution Test

```bash
# Start scaled services
cd infra && ./scripts/start-scaled.sh

# Test load distribution
./scripts/test-load-distribution.sh

# Expected: Requests distributed evenly across instances
# Auth: ~33% per instance (3 instances)
# User/Media: ~50% per instance (2 instances)
```

### 3. Failure Resilience Test

```bash
# Simulate instance failures
cd infra && ./scripts/test-failure-resilience.sh

# This will:
# - Stop one instance of each service
# - Continue making requests
# - Verify system remains operational (>80% success rate)
# - Restart instances and verify recovery
```

### 4. Load Testing

```bash
cd services/load-generator
npm install && npm run build

# Authentication flood (10 RPS for 60s)
npm start -- --scenario auth --duration 60 --rps 10

# Profile read/write mix (15 RPS for 120s)
npm start -- --scenario profile --duration 120 --rps 15

# Avatar upload stress (2 RPS for 60s)
npm start -- --scenario avatar --duration 60 --rps 2

# Mixed workload with bursts
npm start -- --scenario all --duration 300 --rps 20 --mode burst
```

## 📊 Monitoring & Observability

### View Logs

```bash
# All services
docker-compose -f infra/docker-compose.yml logs -f

# Specific service
docker-compose -f infra/docker-compose.yml logs -f auth-service

# Filter by request ID
docker-compose logs -f | grep "req-12345"

# Watch instance distribution
docker-compose logs -f | grep "instanceId"
```

### Monitor Resources

```bash
# Container stats
docker stats

# Database connections
docker exec -it postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Redis info
docker exec -it redis redis-cli INFO

# Queue status
docker exec -it redis redis-cli KEYS "bull:image-processing:*"
```

### Health Checks

```bash
# All services via Nginx
curl http://localhost/health

# Individual services
curl http://localhost/api/auth/health
curl http://localhost/api/users/health
curl http://localhost/api/media/health
```

## 🎯 Use Cases & Scenarios

### 1. Horizontal Scaling Validation

**Goal**: Verify services scale horizontally and distribute load evenly.

```bash
# Start scaled deployment
cd infra && ./scripts/start-scaled.sh

# Run load test
cd ../services/load-generator
npm start -- -s all -d 300 -r 25

# Monitor distribution
docker-compose -f ../../infra/docker-compose.scale.yml logs -f | grep "instanceId"
```

**Success Criteria**:
- All instances receive ~equal request counts
- No single point of failure
- Load increases with more instances

### 2. Failure Resilience Testing

**Goal**: Validate system handles instance failures gracefully.

```bash
# Stop one instance
docker stop auth-service-2

# System should continue with remaining instances
# Monitor error rates (should be <5%)

# Restart instance
docker start auth-service-2

# Verify auto-recovery
```

**Success Criteria**:
- No cascading failures
- >80% success rate with one instance down
- Automatic recovery when instance restarts

### 3. Performance Benchmarking

**Goal**: Measure system throughput and latency under various loads.

```bash
# Gradual load increase
npm start -- -s all -d 60 -r 10
npm start -- -s all -d 60 -r 20
npm start -- -s all -d 60 -r 30
npm start -- -s all -d 60 -r 40

# Identify breaking point
# Document P99 latency at each RPS level
```

**Success Criteria**:
- P99 latency < 1000ms at target RPS
- Error rate < 1% under normal load
- Clear understanding of system limits

### 4. Event-Driven Architecture Validation

**Goal**: Verify events propagate correctly across services.

```bash
# Update profile (triggers user.profile.updated event)
curl -X PATCH http://localhost/api/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"first_name":"Test"}'

# Upload avatar (triggers upload and processing events)
curl -X POST http://localhost/api/media/avatar \
  -H "Authorization: Bearer $TOKEN" \
  -F "avatar=@test.jpg"

# Check logs for event flow
docker-compose logs -f | grep "event"
```

**Success Criteria**:
- Events emitted by correct service
- Events received by subscribers
- Profile updated with avatar URL after processing

## 🔧 Development

### Project Structure

```
.
├── infra/                    # Infrastructure & deployment
│   ├── docker-compose.yml    # Standard deployment
│   ├── docker-compose.scale.yml  # Scaled deployment
│   ├── nginx/                # Nginx config
│   ├── postgres/             # DB initialization
│   └── scripts/              # Helper scripts
├── services/                 # Microservices
│   ├── api-gateway/          # API Gateway
│   ├── auth-service/         # Authentication
│   ├── user-service/         # User profiles
│   ├── media-service/        # Image upload
│   └── load-generator/       # Load testing
├── shared/                   # Shared libraries
│   └── service-common/       # Common utilities
├── TODO.md                   # Implementation checklist
└── README.md                 # This file
```

### Adding a New Service

1. **Create service directory**:
   ```bash
   mkdir services/my-service
   cd services/my-service
   ```

2. **Initialize from template**:
   ```bash
   # Copy structure from existing service
   cp -r ../auth-service/{package.json,tsconfig.json,Dockerfile} .
   ```

3. **Use shared utilities**:
   ```typescript
   import { logger, errorHandler, validateEnv } from 'service-common';
   ```

4. **Add to docker-compose**:
   ```yaml
   my-service:
     build: ../services/my-service
     environment:
       SERVICE_NAME: my-service
       PORT: 3004
   ```

### Running Tests

```bash
# Build all services
npm run build

# Test specific service
cd services/auth-service
npm test

# Integration tests
cd infra
./scripts/start.sh
# Run integration test suite
```

### Environment Variables

All services use consistent environment variable naming:

- `SERVICE_NAME` - Service identifier
- `PORT` - Service port
- `NODE_ENV` - Environment (development/production)
- `INSTANCE_ID` - Instance identifier (for scaling)
- `JWT_SECRET` - Shared JWT secret
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - Database config
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` - Redis config

## 📚 Documentation

- **[TODO.md](./TODO.md)** - Implementation checklist and progress
- **[PROGRESS.md](./PROGRESS.md)** - Development history
- **[services/load-generator/README.md](./services/load-generator/README.md)** - Load testing guide
- **[infra/README.md](./infra/README.md)** - Infrastructure details

## 🐛 Troubleshooting

### Services Won't Start

```bash
# Check if ports are in use
lsof -i :80 -i :3000 -i :3001 -i :3002 -i :3003

# Check Docker resources
docker system df
docker system prune  # Clean up if needed

# Check logs
docker-compose logs
```

### Database Connection Errors

```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Check connection
docker exec -it postgres psql -U postgres -c "\l"

# Reset database
docker-compose down -v  # WARNING: Deletes data
docker-compose up -d
```

### High Error Rates in Load Tests

```bash
# Check service health
curl http://localhost/health

# Monitor resources
docker stats

# Check for errors
docker-compose logs | grep -i error

# Reduce load and retry
npm start -- -s all -d 60 -r 5
```

### Events Not Working

```bash
# Check Redis Pub/Sub
docker exec -it redis redis-cli PUBSUB CHANNELS

# Check subscribers
docker exec -it redis redis-cli PUBSUB NUMSUB user.profile.updated

# Restart services
docker-compose restart user-service media-service
```

## 🚦 Current Status

**Implementation**: 100% Complete ✅

- ✅ Section 0: Guiding constraints
- ✅ Section 1: Repo foundation
- ✅ Section 2: Auth Service
- ✅ Section 3: User Service
- ✅ Section 4: Media Service
- ✅ Section 5: API Gateway
- ✅ Section 6: Infrastructure
- ✅ Section 7: Inter-service communication
- ✅ Section 8: Horizontal scaling validation
- ✅ Section 9: Load generator

**Optional**: Section 10 - Observability (monitoring, tracing, dashboards)

## 🤝 Contributing

This is a learning/experimentation project. Feel free to:

- Add new services
- Implement additional test scenarios
- Enhance monitoring and observability
- Optimize performance
- Add new infrastructure components

## 📄 License

This project is provided as-is for experimentation purposes.

---

**Built with**: Node.js 20, TypeScript, Express, PostgreSQL, Redis, MinIO, Docker  
**Architecture**: Microservices, Event-Driven, Horizontally Scalable  
**Purpose**: Workload Testing, Performance Benchmarking, Resilience Validation

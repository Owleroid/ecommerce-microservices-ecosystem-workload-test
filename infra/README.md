# Infrastructure Setup

Complete Docker Compose orchestration for the entire microservices ecosystem.

## Architecture

```
                        ┌─────────────┐
                        │   Nginx     │
                        │   Port 80   │
                        └──────┬──────┘
                               │
                        ┌──────▼──────┐
                        │ API Gateway │
                        │  Port 3000  │
                        └──────┬──────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │   Auth      │  │    User     │  │   Media     │
    │  Service    │  │  Service    │  │  Service    │
    │  Port 3001  │  │  Port 3002  │  │  Port 3003  │
    └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
           │                │                │
           └────────┬───────┴────────┬───────┘
                    │                │
           ┌────────▼────────┐  ┌────▼────────┐
           │   PostgreSQL    │  │    Redis    │
           │   Port 5432     │  │  Port 6379  │
           └─────────────────┘  └─────────────┘
                                       │
                                  ┌────▼────────┐
                                  │    MinIO    │
                                  │  Port 9000  │
                                  └─────────────┘
```

## Services

### Infrastructure
- **PostgreSQL** (Port 5432) - Shared database with separate schemas per service
- **Redis** (Port 6379) - Shared cache, queues, and rate limiting
- **MinIO** (Ports 9000, 9001) - S3-compatible object storage
- **Nginx** (Port 80) - Load balancer and reverse proxy

### Microservices
- **Auth Service** (Port 3001) - Authentication & JWT tokens
- **User Service** (Port 3002) - User profile management
- **Media Service** (Port 3003) - Image upload & processing
- **API Gateway** (Port 3000) - Request routing & rate limiting

## Quick Start

### 1. Build and Start All Services

```bash
cd infra
docker-compose up --build
```

This will:
- ✅ Build all 4 microservices
- ✅ Start PostgreSQL with `auth_db` and `user_db` databases
- ✅ Start Redis for caching and queues
- ✅ Start MinIO for object storage
- ✅ Start all microservices
- ✅ Start API Gateway
- ✅ Start Nginx load balancer

### 2. Wait for Services to Be Healthy

Watch the logs until you see all services are healthy:
```
auth-service     | Auth service listening on port 3001
user-service     | User service listening on port 3002
media-service    | Media service listening on port 3003
api-gateway      | API gateway listening on port 3000
```

### 3. Test the System

All requests go through Nginx on port 80:

```bash
# Health check
curl http://localhost/health

# Register a user
curl -X POST http://localhost/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "secure123"
  }'

# Login
TOKEN=$(curl -s -X POST http://localhost/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "secure123"
  }' | jq -r '.accessToken')

# Get profile
curl http://localhost/users/me \
  -H "Authorization: Bearer $TOKEN"

# Update profile
curl -X PATCH http://localhost/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Alice",
    "lastName": "Smith",
    "bio": "Full-stack developer"
  }'

# Upload avatar
curl -X POST http://localhost/media/avatar \
  -H "Authorization: Bearer $TOKEN" \
  -F "avatar=@profile.jpg"
```

## Port Mapping

| Service | Internal Port | External Port | Access |
|---------|--------------|---------------|--------|
| Nginx | 80 | 80 | http://localhost |
| API Gateway | 3000 | 3000 | http://localhost:3000 |
| Auth Service | 3001 | - | Internal only |
| User Service | 3002 | - | Internal only |
| Media Service | 3003 | - | Internal only |
| PostgreSQL | 5432 | 5432 | localhost:5432 |
| Redis | 6379 | 6379 | localhost:6379 |
| MinIO API | 9000 | 9000 | http://localhost:9000 |
| MinIO Console | 9001 | 9001 | http://localhost:9001 |

## Access Points

### For Users
- **API Endpoint**: http://localhost (through Nginx)
- **Direct Gateway**: http://localhost:3000 (bypass Nginx)

### For Developers
- **MinIO Console**: http://localhost:9001
  - Username: `minioadmin`
  - Password: `minioadmin`
- **PostgreSQL**: `localhost:5432`
  - Username: `postgres`
  - Password: `postgres`
  - Databases: `auth_db`, `user_db`
- **Redis**: `localhost:6379`
- **Nginx Status**: http://localhost:8080/nginx_status

## Docker Compose Commands

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# Build and start
docker-compose up --build

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f auth-service

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v

# Restart a specific service
docker-compose restart auth-service

# Scale a service (e.g., 3 auth instances)
docker-compose up --scale auth-service=3

# Check service status
docker-compose ps
```

## Service Health Checks

All services have health checks. Check status:

```bash
# Via Docker
docker-compose ps

# Via API
curl http://localhost/health
curl http://localhost:3000/health
curl http://localhost:3001/health  # (if exposing ports)
```

## Networking

All services are on the `microservices` bridge network and can communicate using service names:

- `postgres` → PostgreSQL
- `redis` → Redis
- `minio` → MinIO
- `auth-service` → Auth Service
- `user-service` → User Service
- `media-service` → Media Service
- `api-gateway` → API Gateway

Example from auth-service config:
```yaml
DB_HOST: postgres
REDIS_HOST: redis
```

## Data Persistence

Three volumes persist data between restarts:

- `postgres_data` - Database data
- `redis_data` - Redis snapshots
- `minio_data` - Uploaded images

To reset all data:
```bash
docker-compose down -v
```

## Environment Variables

All services use the same JWT secret (defined in docker-compose.yml):
```
JWT_SECRET: your-super-secret-jwt-key-change-in-production-please
```

⚠️ **Important**: Change this in production!

## Load Balancing with Nginx

Nginx is configured to:
- ✅ Proxy all requests to API Gateway
- ✅ Rate limit at 10 req/sec (burst 20)
- ✅ Set proper headers (X-Real-IP, X-Forwarded-For)
- ✅ Handle WebSocket upgrades
- ✅ Custom error pages (429, 502, 503)

To scale the API Gateway:
1. Uncomment additional servers in `nginx/nginx.conf`
2. Scale the gateway: `docker-compose up --scale api-gateway=3`

## Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose logs

# Check specific service
docker-compose logs auth-service

# Verify dependencies are healthy
docker-compose ps
```

### Database connection errors
```bash
# Check if PostgreSQL is healthy
docker-compose ps postgres

# Check databases were created
docker-compose exec postgres psql -U postgres -l
```

### Can't connect to services
```bash
# Check network
docker network inspect infra_microservices

# Check service is running
docker-compose ps

# Test from inside network
docker-compose exec api-gateway wget -O- http://auth-service:3001/health
```

### Reset everything
```bash
# Stop all services and remove volumes
docker-compose down -v

# Remove all images (forces rebuild)
docker-compose down --rmi all -v

# Start fresh
docker-compose up --build
```

## Development vs Production

This setup is suitable for:
- ✅ Local development
- ✅ Testing
- ✅ Demonstrations
- ✅ Learning

For production, consider:
- Use managed databases (RDS, etc.)
- Use managed Redis (ElastiCache, etc.)
- Use managed object storage (S3, etc.)
- Use Kubernetes for orchestration
- Add TLS/SSL certificates
- Use secrets management (not env vars)
- Add monitoring & logging
- Set up CI/CD pipelines

## Next Steps

1. **Test the full system** - Try the complete user journey
2. **Scale services** - Test with multiple instances
3. **Load testing** - Use the load generator (Phase 8)
4. **Monitoring** - Add observability tools (Phase 9)

## File Structure

```
infra/
├── docker-compose.yml          # Main orchestration file
├── nginx/
│   └── nginx.conf             # Load balancer config
├── scripts/
│   └── create-multiple-databases.sh  # DB init script
└── README.md                  # This file
```

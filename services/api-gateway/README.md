# API Gateway

Central entry point for all microservices. Routes requests to auth, user, and media services with rate limiting and request logging.

## Features

- **Request Routing** - Proxies requests to downstream services
- **Rate Limiting** - Redis-backed rate limiting (100 req/min default)
- **Request Logging** - Logs all proxied requests with correlation IDs
- **Health Checks** - Aggregated health status
- **Error Handling** - Graceful degradation if services are down
- **Header Forwarding** - Preserves auth headers and request IDs

## Architecture

```
Client → API Gateway (Port 3000) → Backend Services
         │
         ├─ /auth/*   → Auth Service (3001)
         ├─ /users/*  → User Service (3002)
         └─ /media/*  → Media Service (3003)
```

## API Routes

All routes are proxied transparently to backend services.

### Auth Service Routes (`/auth/*`)
- `POST /auth/register` → `http://auth-service:3001/auth/register`
- `POST /auth/login` → `http://auth-service:3001/auth/login`
- `POST /auth/refresh` → `http://auth-service:3001/auth/refresh`
- `POST /auth/logout` → `http://auth-service:3001/auth/logout`

### User Service Routes (`/users/*`)
- `GET /users/me` → `http://user-service:3002/users/me`
- `PATCH /users/me` → `http://user-service:3002/users/me`

### Media Service Routes (`/media/*`)
- `POST /media/avatar` → `http://media-service:3003/media/avatar`
- `GET /media/jobs/:jobId` → `http://media-service:3003/media/jobs/:jobId`

### Gateway Routes
- `GET /` - Service information
- `GET /health` - Health check

## Rate Limiting

**Default Configuration:**
- **Window**: 60 seconds
- **Max Requests**: 100 per window
- **Storage**: Redis (persistent across instances)
- **Response**: `429 Too Many Requests` with `Retry-After` header

**Excluded Paths:**
- `/health` - No rate limiting on health checks

**Headers:**
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Time when limit resets
- `Retry-After`: Seconds until limit resets (on 429 response)

## Request Flow

```
1. Client Request
   ↓
2. API Gateway (Rate Limit Check)
   ↓
3. Request Logger (Add/Forward Request ID)
   ↓
4. Route Matcher (/auth|/users|/media)
   ↓
5. HTTP Proxy (Forward to Service)
   ↓
6. Backend Service Processing
   ↓
7. Response Logger
   ↓
8. Client Response
```

## Local Development

### Prerequisites
- Node.js 20+
- Redis
- All backend services running:
  - Auth Service on port 3001
  - User Service on port 3002
  - Media Service on port 3003

### Setup

1. Start Redis:
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

2. Start backend services (in separate terminals):
```bash
# Terminal 1
cd services/auth-service && docker-compose up

# Terminal 2
cd services/user-service && docker-compose up

# Terminal 3
cd services/media-service && docker-compose up
```

3. Run gateway in development mode:
```bash
npm run dev:gateway
```

The gateway will be available at `http://localhost:3000`.

## Docker Deployment

### Build and run:
```bash
cd services/api-gateway
docker-compose up --build
```

**Note:** The docker-compose for the gateway expects backend services to be accessible. For full-stack deployment, see the root-level infrastructure setup.

## Testing Through Gateway

All requests now go through the gateway on port 3000:

```bash
# Register (through gateway)
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Login (through gateway)
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' | jq -r '.accessToken')

# Get profile (through gateway)
curl http://localhost:3000/users/me \
  -H "Authorization: Bearer $TOKEN"

# Update profile (through gateway)
curl -X PATCH http://localhost:3000/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe"
  }'

# Upload avatar (through gateway)
curl -X POST http://localhost:3000/media/avatar \
  -H "Authorization: Bearer $TOKEN" \
  -F "avatar=@image.jpg"

# Check gateway health
curl http://localhost:3000/health

# Test rate limiting (send 101 requests rapidly)
for i in {1..101}; do
  curl -s http://localhost:3000/health -w "%{http_code}\n" -o /dev/null
done
```

## Service Discovery

The gateway uses environment variables for service URLs:

```env
AUTH_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002
MEDIA_SERVICE_URL=http://localhost:3003
```

In Docker:
```env
AUTH_SERVICE_URL=http://auth-service:3001
USER_SERVICE_URL=http://user-service:3002
MEDIA_SERVICE_URL=http://media-service:3003
```

## Error Handling

### Service Unavailable (503)
If a backend service is down:
```json
{
  "error": {
    "message": "Auth service unavailable",
    "statusCode": 503
  }
}
```

### Rate Limit Exceeded (429)
```json
{
  "error": {
    "message": "Too many requests, please try again later",
    "statusCode": 429,
    "retryAfter": 60
  }
}
```

### Not Found (404)
For undefined routes:
```json
{
  "error": {
    "message": "Route not found",
    "statusCode": 404,
    "path": "/unknown"
  }
}
```

## Logging

All requests are logged with:
- Request ID (generated or forwarded)
- HTTP method and path
- Target service URL
- Response status code
- Instance ID (for multiple gateway instances)

Example log:
```json
{
  "message": "Proxied auth request",
  "method": "POST",
  "path": "/auth/login",
  "statusCode": 200,
  "target": "http://auth-service:3001",
  "requestId": "req-1704067200000-abc123",
  "service": "api-gateway",
  "instanceId": "gateway-1"
}
```

## Benefits

### Single Entry Point
- Clients only need to know one URL
- Simplified frontend configuration
- Easier to add/remove backend services

### Rate Limiting
- Protect backend services from abuse
- Per-IP limits (works with load balancers)
- Centralized configuration

### Request Tracing
- Correlation IDs flow through all services
- End-to-end request tracking
- Easier debugging

### Security
- Hide internal service URLs
- Centralized authentication checks (future)
- CORS configuration in one place (future)

## Future Enhancements

- [ ] JWT validation at gateway level (avoid duplicate checks)
- [ ] CORS configuration
- [ ] Request/response transformation
- [ ] Caching for GET requests
- [ ] Circuit breaker pattern
- [ ] Service health-based routing
- [ ] Metrics aggregation
- [ ] WebSocket support

## Environment Variables

Key variables:
- `PORT`: Gateway port (default: 3000)
- `AUTH_SERVICE_URL`: Auth service URL
- `USER_SERVICE_URL`: User service URL
- `MEDIA_SERVICE_URL`: Media service URL
- `REDIS_HOST`: Redis host for rate limiting
- `RATE_LIMIT_WINDOW_MS`: Rate limit window (ms)
- `RATE_LIMIT_MAX_REQUESTS`: Max requests per window

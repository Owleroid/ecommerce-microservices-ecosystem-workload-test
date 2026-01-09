# User Profile Service

User profile management microservice built with Node.js, Express, TypeScript, PostgreSQL, and Redis.

## Features

- Get user profile (auto-created on first access)
- Update user profile
- JWT authentication (validates tokens from auth-service)
- Redis caching for profile data (5 min TTL)
- Stateless authentication
- Health check endpoint
- Graceful shutdown
- Request logging with correlation IDs

## API Endpoints

All endpoints require a valid JWT access token from the auth-service.

### GET /users/me
Get the authenticated user's profile.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "profile": {
    "id": 1,
    "userId": 42,
    "firstName": "John",
    "lastName": "Doe",
    "bio": "Software engineer",
    "avatarUrl": "https://example.com/avatar.jpg",
    "phone": "+1234567890",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### PATCH /users/me
Update the authenticated user's profile.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "bio": "Full-stack developer",
  "phone": "+1234567890"
}
```

All fields are optional. Only provided fields will be updated.

**Response:**
```json
{
  "message": "Profile updated successfully",
  "profile": {
    "id": 1,
    "userId": 42,
    "firstName": "John",
    "lastName": "Doe",
    "bio": "Full-stack developer",
    "avatarUrl": null,
    "phone": "+1234567890",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "user-service",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 120,
  "checks": {
    "database": true,
    "redis": true
  }
}
```

## Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL
- Redis
- Auth service running (for JWT validation)

### Setup

1. Start PostgreSQL and Redis locally, or use Docker:
```bash
docker-compose up postgres redis -d
```

2. Run in development mode (from project root):
```bash
npm run dev:user
```

The service will be available at `http://localhost:3002`.

## Docker Deployment

### Build and run with Docker Compose:
```bash
cd services/user-service
docker-compose up --build
```

This will start:
- PostgreSQL on port 5433
- Redis on port 6380
- User service on port 3002

### Test the service:

First, get a JWT token from auth-service:
```bash
# Login to auth-service
TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.accessToken')

# Get profile
curl http://localhost:3002/users/me \
  -H "Authorization: Bearer $TOKEN"

# Update profile
curl -X PATCH http://localhost:3002/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "bio": "Software engineer"
  }'
```

## Architecture

```
src/
├── config/          # Database, Redis, environment config
├── controllers/     # Request handlers
├── middleware/      # JWT authentication middleware
├── models/          # Data models and repositories
├── routes/          # Route definitions
├── services/        # Business logic (with caching)
├── app.ts           # Express app setup
└── index.ts         # Entry point
```

## Caching Strategy

- Profile data is cached in Redis for 5 minutes (configurable via `CACHE_TTL`)
- Cache is invalidated on profile updates
- Cache misses trigger database queries
- Cache failures are logged but don't block requests

## Environment Variables

Key variables:
- `JWT_SECRET`: Must match the auth-service secret!
- `CACHE_TTL`: Cache time-to-live in seconds (default: 300)
- `DB_*`: PostgreSQL connection settings
- `REDIS_*`: Redis connection settings

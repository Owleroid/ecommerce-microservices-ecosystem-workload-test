# Auth Service

Authentication microservice built with Node.js, Express, TypeScript, PostgreSQL, and Redis.

## Features

- User registration with email validation
- Login with JWT access tokens
- Refresh tokens stored in Redis
- Password hashing with bcrypt
- Stateless authentication
- Health check endpoint
- Graceful shutdown
- Request logging with correlation IDs

## API Endpoints

### POST /auth/register
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST /auth/login
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### POST /auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "message": "Token refreshed",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### POST /auth/logout
Logout (requires authentication).

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "message": "Logout successful"
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "auth-service",
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

### Setup

1. Copy environment file:
```bash
cp .env.example .env
```

2. Install dependencies (from root):
```bash
npm install
```

3. Start PostgreSQL and Redis locally, or use Docker:
```bash
docker-compose up postgres redis -d
```

4. Run in development mode:
```bash
npm run dev:auth
```

The service will be available at `http://localhost:3001`.

## Docker Deployment

### Build and run with Docker Compose:
```bash
docker-compose up --build
```

This will start:
- PostgreSQL on port 5432
- Redis on port 6379
- Auth service on port 3001

### Test the service:
```bash
# Register a user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Health check
curl http://localhost:3001/health
```

## Architecture

```
src/
├── config/          # Database, Redis, environment config
├── controllers/     # Request handlers
├── middleware/      # Auth middleware, validation
├── models/          # Data models and repositories
├── routes/          # Route definitions
├── services/        # Business logic
├── app.ts           # Express app setup
└── index.ts         # Entry point
```

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `JWT_SECRET`: Secret key for signing JWTs (change in production!)
- `JWT_EXPIRY`: Access token expiration time (default: 1h)
- `REFRESH_TOKEN_EXPIRY`: Refresh token expiration time (default: 7d)
- `DB_*`: PostgreSQL connection settings
- `REDIS_*`: Redis connection settings

# Auth Service Setup Guide

## Quick Start with Docker Compose (Recommended)

This is the easiest way to get started - everything is configured and ready to go:

```bash
cd services/auth-service
docker-compose up --build
```

This will start PostgreSQL, Redis, and the auth service. The service will be available at `http://localhost:3001`.

## Testing the Service

Once running, test the endpoints:

```bash
# Health check
curl http://localhost:3001/health

# Register a new user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Save the tokens from the login response, then test refresh:
curl -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN_HERE"
  }'

# Logout (requires access token)
curl -X POST http://localhost:3001/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

## Local Development (without Docker)

If you want to run locally for development:

1. Start PostgreSQL and Redis:
```bash
# Using Docker for just the databases
docker-compose up postgres redis -d
```

2. Create a `.env` file in `services/auth-service/`:
```env
SERVICE_NAME=auth-service
PORT=3001
NODE_ENV=development
INSTANCE_ID=auth-1

JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRY=1h
REFRESH_TOKEN_EXPIRY=7d

DB_HOST=localhost
DB_PORT=5432
DB_NAME=auth_db
DB_USER=postgres
DB_PASSWORD=postgres

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

3. From the project root, run:
```bash
npm install
npm run dev:auth
```

## What's Inside

The auth service includes:
- ✅ User registration with email validation
- ✅ Login with JWT access tokens  
- ✅ Refresh token flow (stored in Redis)
- ✅ Password hashing with bcrypt
- ✅ PostgreSQL for user persistence
- ✅ Health checks for database and Redis
- ✅ Graceful shutdown handling
- ✅ Request logging with correlation IDs
- ✅ Centralized error handling

## Next Steps

Now that the auth service is running, you can:
1. Build the User Profile Service (uses the JWT tokens from this service)
2. Build the Media Service
3. Add an API Gateway to route requests
4. Set up horizontal scaling

Check the main TODO.md for the full roadmap!

# ecommerce-microservices-ecosystem-workload-test

A small **e-commerce-flavored microservices ecosystem** you can spin up to **experiment with workload testing**, **horizontal scaling**, and **failure resilience** in a realistic (but intentionally minimal) architecture.

The repo is organized around building a few focused services, wiring them together with both **HTTP** and **events**, then hammering the system with a **load generator** and observing how it behaves under pressure.

Implementation note: the services in this repo are intended to be built with **Node.js + Express + TypeScript** (kept deliberately simple; no NestJS).

## Quick Start

```bash
# Install dependencies
npm install

# Start auth service in development
npm run dev:auth

# Or run with Docker Compose
cd services/auth-service
docker-compose up --build
```

## What you can do with this repo

- **Try out load scenarios**: authentication bursts, profile reads/writes, avatar upload stress
- **Validate stateless scaling**: run multiple instances behind a load balancer and confirm traffic distribution
- **Experiment with failure modes**: kill containers and see whether the system degrades gracefully
- **Measure & compare** (optional): add correlation IDs, centralized logs, latency/error tracking

## Planned architecture (high level)

- **API Gateway** (`services/api-gateway`)
  - Routes requests to backend services (`/auth/*`, `/users/*`)
  - Forwards auth headers, rate limits via Redis, adds request logging and `/health`
- **Auth Service** (`services/auth-service`)
  - `POST /register`, `POST /login`
  - Issues JWT access tokens, stores refresh tokens in Redis, persists users in PostgreSQL
- **User Profile Service** (`services/user-service`)
  - `GET /users/me`, `PATCH /users/me`
  - Validates JWTs issued by the auth service, caches profiles in Redis, persists to PostgreSQL
  - Emits domain events when profiles change
- **Media Service** (`services/media-service`)
  - Async avatar upload + background processing with BullMQ
  - Stores images in MinIO
  - Consumes/emits avatar-related events (e.g. `user.avatar.uploaded`, `user.avatar.processed`)

### Communication patterns

- **Synchronous**: HTTP calls through the gateway for user-facing APIs
- **Asynchronous**: Redis Pub/Sub for domain events; BullMQ for background jobs
- **Operational**: each service exposes a `/health` endpoint for health checks

## Infrastructure goals

Planned infrastructure lives under `infra/` and is intended to include:

- Docker Compose orchestration
- Nginx as a load balancer
- Redis (cache + pub/sub + queues)
- PostgreSQL (separate schema per service; no shared DB)
- MinIO for object storage

## Scaling & resilience goals

The ecosystem is designed to make it easy to test:

- Scaling auth to **3 instances**
- Scaling user/media to **2 instances**
- Verifying load distribution via logs
- Simulating container failure and validating system resilience

## Load generator

The load generator (`services/load-generator`) is intended to run scenarios like:

- Authentication flood
- Profile read/write mix
- Avatar upload stress

It should support both **constant RPS** and **burst** modes.

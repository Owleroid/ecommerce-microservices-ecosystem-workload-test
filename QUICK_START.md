# Quick Start Guide

Get the E-Commerce Microservices Ecosystem up and running in minutes.

---

## ⚡ Two-Step Flow

```
┌─────────────────────────────────────────────────────────┐
│  Step 1: START SERVICES                                 │
│  cd infra && ./scripts/start.sh                         │
│  (Wait ~30 seconds for health checks)                   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Step 2: TEST / USE THE SYSTEM                          │
│  • Run API requests (curl)                              │
│  • Run load tests (load-generator)                      │
│  • Run validation scripts (test-*.sh)                   │
└─────────────────────────────────────────────────────────┘
```

**Important**: Services must be running before you can test them!

---

## 🚀 Fastest Way to Start

**One command to rule them all:**

```bash
cd infra
./scripts/start.sh
```

That's it! Everything will start automatically. Skip to [Verify Setup](#verify-setup) to confirm it's running.

---

## 📋 Prerequisites

Before starting, ensure you have:

- ✅ **Docker** installed and running (version 20.10+)
- ✅ **Docker Compose V2** (built into Docker, uses `docker compose` command)
- ✅ **Node.js 20+** (for development mode)
- ✅ At least **8GB RAM** available

### Check Prerequisites

```bash
# Check Docker
docker --version
# Should show: Docker version 20.10+ or higher

# Check Docker Compose V2
docker compose version
# Should show: Docker Compose version v2.x.x

# Check Node.js (for development)
node --version  # Should show v20.x.x or higher
npm --version
```

**Important**: This project uses **Docker Compose V2** (command: `docker compose` with a space), not the older V1 (`docker compose` with a hyphen). If you only have V1, see `DOCKER_COMPOSE_V2.md` for migration instructions.

---

## 🎯 Startup Options

### Option 1: Standard Deployment (Recommended for First Time)

**What it does:** Starts one instance of each service + infrastructure

```bash
cd infra
./scripts/start.sh
```

**Services started:**
- 1 Auth Service
- 1 User Service
- 1 Media Service
- 1 API Gateway
- Nginx Load Balancer
- PostgreSQL, Redis, MinIO

### Option 2: Scaled Deployment (Production-like)

**What it does:** Starts multiple instances per service with load balancing

```bash
cd infra
./scripts/start-scaled.sh
```

**Services started:**
- 3 Auth Service instances
- 2 User Service instances
- 2 Media Service instances
- 1 API Gateway (with round-robin load balancing)
- Nginx Load Balancer
- PostgreSQL, Redis, MinIO

### Option 3: Development Mode

**What it does:** Run services locally without Docker (for development)

```bash
# 1. Install dependencies
npm install

# 2. Build shared libraries
npm run build:all

# 3. Start infrastructure only
cd infra
docker compose up postgres redis minio

# 4. In separate terminals, run each service:
npm run dev:auth     # Terminal 1
npm run dev:user     # Terminal 2
npm run dev:media    # Terminal 3
npm run dev:gateway  # Terminal 4
```

---

## ✅ Verify Setup

### How to Know When Services Are Ready

After starting services, you'll see:

```bash
# Good signs:
✓ Infrastructure services are healthy
✓ Microservices are healthy
API gateway listening on port 3000
```

Then verify with:

```bash
cd infra
docker compose ps
# All services should show "(healthy)" status

curl http://localhost/health
# Should return: {"status":"healthy",...}
```

**Typical startup time**: 30-60 seconds for standard, 60-90 seconds for scaled deployment.

### Check All Services Are Running

```bash
# View container status
docker ps

# Or with Docker Compose
cd infra
docker compose ps
```

Expected output: All services should show "Up" status.

### Health Checks

```bash
# Main health check (via Nginx)
curl http://localhost/health

# Individual services
curl http://localhost/api/auth/health
curl http://localhost/api/users/health
curl http://localhost/api/media/health
```

Expected: All should return `200 OK` with health status.

### Access Points

After successful startup, these endpoints are available:

| Service | URL | Credentials |
|---------|-----|-------------|
| **Main API** | http://localhost | - |
| **API Gateway** | http://localhost:3000 | - |
| **MinIO Console** | http://localhost:9001 | minioadmin / minioadmin |
| **PostgreSQL** | localhost:5432 | postgres / postgres |
| **Redis** | localhost:6379 | (no password) |

---

## 🧪 Quick Test

### Test the API

```bash
# 1. Register a user
curl -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}'

# 2. Login and get token
TOKEN=$(curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}' | \
  jq -r '.accessToken')

echo "Token: $TOKEN"

# 3. Get profile
curl http://localhost/api/users/me \
  -H "Authorization: Bearer $TOKEN"

# 4. Update profile
curl -X PATCH http://localhost/api/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"first_name":"John","last_name":"Doe","bio":"Testing the system"}'

# 5. Upload avatar (replace with actual image path)
curl -X POST http://localhost/api/media/avatar \
  -H "Authorization: Bearer $TOKEN" \
  -F "avatar=@/path/to/image.jpg"
```

---

## 📊 Testing & Load Generation

⚠️ **IMPORTANT**: All testing requires services to be running first!

### Testing Workflow

```
1. Start Services  →  2. Wait for Health  →  3. Run Tests
```

### Test Types Comparison

| Feature | Quick Tests (`test-*.sh`) | Load Generator | Manual API Calls |
|---------|---------------------------|----------------|------------------|
| **Purpose** | Validate setup | Stress testing | Development/Debug |
| **Request Count** | ~20 requests | Hundreds/Thousands | 1-10 requests |
| **Duration** | ~30 seconds | Minutes to hours | Instant |
| **Prerequisites** | Services running | Services running + npm build | Services running |
| **Best For** | Quick validation | Performance testing | Feature testing |
| **Example** | `./test-load-distribution.sh` | `npm start -- -s all -r 20` | `curl http://localhost/health` |

---

### Quick Validation Tests (Low Load)

These are **simple test scripts** that make a few requests to validate your setup.

**Prerequisites**: Services must be running (use `./scripts/start-scaled.sh`)

#### Test Load Distribution Across Instances

Shows how requests are distributed across multiple service instances:

```bash
# Step 1: Start scaled services (if not already running)
cd infra
./scripts/start-scaled.sh

# Step 2: Wait for services to be healthy (~30 seconds)
sleep 30
docker compose -f docker-compose.scale.yml ps

# Step 3: Run the test (makes 20 requests)
./scripts/test-load-distribution.sh
```

**What it does**: Makes 20 requests and shows which instance handled each one.

#### Test Failure Resilience

Tests if the system survives when containers crash:

```bash
# Prerequisite: Scaled services must be running
cd infra

# Run the test (stops containers, tests, then restarts them)
./scripts/test-failure-resilience.sh
```

**What it does**: Stops containers one by one, verifies system still works, then restarts them.

---

### Heavy Load Testing (High RPS)

For **stress testing** with thousands of requests, use the **Load Generator**.

**Prerequisites**: 
- Services must be running (scaled deployment recommended: `./scripts/start-scaled.sh`)
- Load generator must be built

#### Setup Load Generator (One-Time)

```bash
cd services/load-generator
npm install
npm run build
```

#### Run Load Test Scenarios

**Important**: Services must be running in another terminal!

```bash
# Make sure you're in the load-generator directory
cd services/load-generator

# Authentication flood test (10 RPS for 60 seconds)
npm start -- --scenario auth --duration 60 --rps 10

# Profile read/write test (15 RPS for 120 seconds)
npm start -- --scenario profile --duration 120 --rps 15

# Avatar upload stress test (2 RPS for 60 seconds)
npm start -- --scenario avatar --duration 60 --rps 2

# Mixed workload (20 RPS for 180 seconds)
npm start -- --scenario all --duration 180 --rps 20

# Burst mode test (20 RPS with 5x bursts)
npm start -- --scenario all --duration 300 --rps 20 --mode burst
```

**What it does**: Generates hundreds/thousands of requests per second for stress testing.

---

## 👀 Monitor the System

### View Logs

```bash
# All services
docker compose -f infra/docker compose.yml logs -f

# Specific service
docker compose -f infra/docker compose.yml logs -f auth-service

# Multiple services
docker compose -f infra/docker compose.yml logs -f auth-service user-service

# Filter by keyword
docker compose -f infra/docker compose.yml logs -f | grep "error"

# See which instance handled requests
docker compose -f infra/docker compose.yml logs -f | grep "instanceId"
```

### Monitor Resources

```bash
# Container stats
docker stats

# Database connections
docker exec -it postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Redis info
docker exec -it redis redis-cli INFO stats

# Queue status
docker exec -it redis redis-cli KEYS "bull:image-processing:*"
```

---

## 🛑 Stop the System

### Standard Stop

```bash
cd infra
docker compose down
```

### Stop and Remove Data

```bash
cd infra
docker compose down -v  # ⚠️ This deletes all data
```

### Stop Scaled Deployment

```bash
cd infra
docker compose -f docker compose.scale.yml down
```

### Using Stop Script

```bash
cd infra
./scripts/stop.sh
```

---

## 🔄 Restart/Rebuild

### Restart After Code Changes

```bash
cd infra

# Rebuild specific service
docker compose up --build -d auth-service

# Rebuild all services
docker compose up --build -d
```

### Full Clean Restart

```bash
cd infra
docker compose down -v
./scripts/start.sh
```

---

## 🐛 Troubleshooting

### Port Already in Use (Common Issue)

If you see errors like `Bind for 0.0.0.0:9000 failed: port is already allocated`:

```bash
# Find which process is using the port
sudo lsof -i :9000  # Or :80, :3000, :5432, :6379

# If it's from another Docker container
docker ps -a | grep minio  # Or the service name
docker stop <container-name>
docker rm <container-name>

# Then restart your services
cd infra
./scripts/start.sh
```

**Common culprits:**
- MinIO from another project (ports 9000-9001)
- Nginx from another project (port 80)
- Previous instance of this project still running

### Docker Compose V1 vs V2 Issues

If you get `docker compose: command not found` or Python errors:

```bash
# This project requires Docker Compose V2
docker compose version  # Should work (with space)

# If not available, you need to update Docker
# See DOCKER_COMPOSE_V2.md for details
```

### Services Won't Start

```bash
# Stop everything first
cd infra
./scripts/stop.sh

# Check if ports are already in use
sudo lsof -i :80 -i :3000 -i :5432 -i :6379 -i :9000

# Clean up Docker system
docker system prune

# Try starting again
./scripts/start.sh
```

### Database Connection Errors

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
docker exec -it postgres psql -U postgres -c "\l"

# Restart PostgreSQL
docker compose restart postgres
```

### Redis Connection Errors

```bash
# Check Redis is running
docker ps | grep redis

# Test connection
docker exec -it redis redis-cli PING

# Restart Redis
docker compose restart redis
```

### Service Not Responding

```bash
# Check service status
docker compose ps

# View service logs
docker compose logs auth-service

# Restart service
docker compose restart auth-service

# Rebuild and restart
docker compose up --build -d auth-service
```

### High Error Rates in Load Tests

```bash
# Check service health
curl http://localhost/health

# Monitor resources
docker stats

# Check logs for errors
docker compose logs | grep -i error

# Reduce load and retry
cd services/load-generator
npm start -- -s all -d 60 -r 5
```

---

## 📖 Common Workflows

### Workflow 1: Quick System Test

Test if everything works with a simple API call:

```bash
# 1. Start system
cd infra
./scripts/start.sh

# 2. Wait for services to be ready
echo "Waiting 30 seconds for services to start..."
sleep 30

# 3. Health check
curl http://localhost/health

# 4. Register and test
curl -X POST http://localhost/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# 5. Done! ✓
```

### Workflow 2: Validate Load Distribution

Test that requests are distributed across multiple instances:

```bash
# 1. Start SCALED system (important!)
cd infra
./scripts/start-scaled.sh

# 2. Wait for ALL services to be healthy
echo "Waiting 60 seconds for all scaled instances..."
sleep 60

# 3. Verify all containers are running
docker compose -f docker-compose.scale.yml ps

# 4. Run distribution test
./scripts/test-load-distribution.sh

# Expected: Requests distributed evenly across instances
```

### Workflow 3: Heavy Load Testing

Stress test the system with high request rates:

```bash
# 1. Start SCALED system in Terminal 1
cd infra
./scripts/start-scaled.sh

# Wait for services (watch logs in Terminal 1)
# When you see "healthy" status for all, proceed

# 2. In Terminal 2, build load generator (first time only)
cd services/load-generator
npm install && npm run build

# 3. Run load test
npm start -- -s all -d 180 -r 20

# 4. In Terminal 3, monitor the system
cd infra
docker compose -f docker-compose.scale.yml logs -f | grep "instanceId"

# 5. When done, stop everything (Terminal 1 or new terminal)
cd infra
docker compose -f docker-compose.scale.yml down
```

### Workflow 4: Test Failure Resilience

Verify the system survives container failures:

```bash
# 1. Start scaled system
cd infra
./scripts/start-scaled.sh

# 2. Wait for healthy status
sleep 60
docker compose -f docker-compose.scale.yml ps

# 3. Run failure simulation
./scripts/test-failure-resilience.sh

# Expected: System continues working even when containers are stopped
```

### Workflow 5: Development Mode

For active development with hot-reload:

```bash
# 1. Install dependencies (first time only)
npm install && npm run build:all

# 2. Start infrastructure only
cd infra
docker compose up postgres redis minio

# 3. In separate terminals, run services in dev mode
npm run dev:auth     # Terminal 1 - Auto-reloads on code changes
npm run dev:user     # Terminal 2
npm run dev:media    # Terminal 3
npm run dev:gateway  # Terminal 4

# 4. Make changes, test, repeat

# 5. Stop infrastructure when done
cd infra
docker compose down
```

---

## ⚡ Command Quick Reference

| Task | Command |
|------|---------|
| **Start everything** | `cd infra && ./scripts/start.sh` |
| **Start scaled** | `cd infra && ./scripts/start-scaled.sh` |
| **Stop** | `cd infra && docker compose down` |
| **Stop + delete data** | `cd infra && docker compose down -v` |
| **View logs** | `docker compose logs -f` |
| **Health check** | `curl http://localhost/health` |
| **Container status** | `docker compose ps` |
| **Resource usage** | `docker stats` |
| **Rebuild service** | `docker compose up --build -d SERVICE_NAME` |
| **Clean restart** | `docker compose down -v && ./scripts/start.sh` |
| **Run load test** | `cd services/load-generator && npm start -- -s all -d 60 -r 10` |
| **Test distribution** | `cd infra && ./scripts/test-load-distribution.sh` |
| **Test resilience** | `cd infra && ./scripts/test-failure-resilience.sh` |

---

## 🎯 What to Do After Starting

1. ✅ **Verify** - Run health checks
2. ✅ **Test Basic Flow** - Register → Login → Get Profile
3. ✅ **Check Logs** - Make sure no errors
4. ✅ **Run Load Tests** - Test under load
5. ✅ **Monitor** - Watch resource usage
6. ✅ **Experiment** - Try failure scenarios

---

## 💡 Pro Tips

1. **Always start services first** - No tests will work without running services!
2. **Wait for health checks** - Don't rush, let services fully initialize (~30-60 seconds)
3. **Use scaled deployment for load tests** - Single instances can't show load balancing
4. **Monitor in separate terminal** - Keep logs open while testing: `docker compose logs -f`
5. **Check container status** - Use `docker compose ps` to verify all services are healthy
6. **Start small, then scale up** - First run `start.sh`, then try `start-scaled.sh`
7. **Clean slate for issues** - Use `docker compose down -v` if things get weird
8. **Read the logs** - They show which instance handled each request

---

**Need Help?** Check the troubleshooting section above or review the full [README.md](./README.md)

**Ready to start?** Just run:
```bash
cd infra && ./scripts/start.sh
```

🚀 **Happy Testing!**

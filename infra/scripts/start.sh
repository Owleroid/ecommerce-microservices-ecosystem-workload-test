#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Microservices Ecosystem Startup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi

# Check if docker compose is available (V2)
if ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: docker compose is not available${NC}"
    echo -e "${YELLOW}Try: sudo apt install docker-compose-plugin${NC}"
    exit 1
fi

cd "$(dirname "$0")"

echo -e "${YELLOW}Building all service images...${NC}"
docker compose build

echo -e "${YELLOW}Starting infrastructure services (postgres, redis, minio)...${NC}"
docker compose up -d postgres redis minio

echo -e "${YELLOW}Waiting for infrastructure to be healthy...${NC}"
for i in {1..30}; do
  if docker compose ps | grep -q "postgres.*healthy" && \
     docker compose ps | grep -q "redis.*healthy" && \
     docker compose ps | grep -q "minio.*healthy"; then
    echo -e "${GREEN}✓ Infrastructure services are healthy${NC}"
    break
  fi
  if [ $i -eq 30 ]; then
    echo -e "${RED}✗ Timeout waiting for infrastructure${NC}"
    docker compose logs postgres redis minio | tail -20
    exit 1
  fi
  echo -n "."
  sleep 2
done
echo ""

echo -e "${YELLOW}Starting microservices (auth, user, media)...${NC}"
docker compose up -d auth-service user-service media-service

echo -e "${YELLOW}Waiting for microservices to be healthy...${NC}"
for i in {1..30}; do
  if docker compose ps | grep -q "auth-service.*healthy" && \
     docker compose ps | grep -q "user-service.*healthy" && \
     docker compose ps | grep -q "media-service.*healthy"; then
    echo -e "${GREEN}✓ Microservices are healthy${NC}"
    break
  fi
  if [ $i -eq 30 ]; then
    echo -e "${RED}✗ Timeout waiting for microservices${NC}"
    docker compose logs auth-service user-service media-service | tail -30
    exit 1
  fi
  echo -n "."
  sleep 2
done
echo ""

echo -e "${YELLOW}Starting API Gateway...${NC}"
docker compose up -d api-gateway

echo -e "${YELLOW}Starting Nginx load balancer...${NC}"
docker compose up -d nginx

sleep 3

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  System Status${NC}"
echo -e "${GREEN}========================================${NC}"
docker compose ps

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Access Points${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "  ${GREEN}API Endpoint (via Nginx):${NC}"
echo -e "    http://localhost"
echo ""
echo -e "  ${GREEN}API Gateway (direct):${NC}"
echo -e "    http://localhost:3000"
echo ""
echo -e "  ${GREEN}MinIO Console:${NC}"
echo -e "    http://localhost:9001"
echo -e "    Username: minioadmin"
echo -e "    Password: minioadmin"
echo ""
echo -e "  ${GREEN}PostgreSQL:${NC}"
echo -e "    Host: localhost:5432"
echo -e "    User: postgres / Password: postgres"
echo -e "    Databases: auth_db, user_db"
echo ""
echo -e "  ${GREEN}Redis:${NC}"
echo -e "    Host: localhost:6379"
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Quick Test${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "  curl http://localhost/health"
echo ""
echo -e "${YELLOW}View logs:${NC} docker compose logs -f"
echo -e "${YELLOW}Stop all:${NC} docker compose down"
echo ""

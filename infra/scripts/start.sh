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

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: docker-compose is not installed${NC}"
    exit 1
fi

cd "$(dirname "$0")"

echo -e "${YELLOW}Starting infrastructure services...${NC}"
docker-compose up -d postgres redis minio

echo -e "${YELLOW}Waiting for infrastructure to be healthy...${NC}"
sleep 10

echo -e "${YELLOW}Building and starting microservices...${NC}"
docker-compose up --build -d auth-service user-service media-service

echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 5

echo -e "${YELLOW}Starting API Gateway...${NC}"
docker-compose up -d api-gateway

echo -e "${YELLOW}Starting Nginx load balancer...${NC}"
docker-compose up -d nginx

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  System Status${NC}"
echo -e "${GREEN}========================================${NC}"
docker-compose ps

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
echo -e "${YELLOW}View logs:${NC} docker-compose logs -f"
echo -e "${YELLOW}Stop all:${NC} docker-compose down"
echo ""

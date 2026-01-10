#!/usr/bin/env bash

# Horizontal Scaling Test Script
# This script demonstrates the system running with multiple instances of each service

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "======================================"
echo "Horizontal Scaling Validation"
echo "======================================"
echo

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Starting scaled services...${NC}"
docker compose -f docker-compose.scale.yml up -d

echo
echo -e "${BLUE}Step 2: Waiting for services to be healthy...${NC}"
sleep 20

echo
echo -e "${BLUE}Step 3: Checking service instances...${NC}"
echo "Auth service instances:"
docker ps --filter "name=auth-service" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo
echo "User service instances:"
docker ps --filter "name=user-service" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo
echo "Media service instances:"
docker ps --filter "name=media-service" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo
echo -e "${GREEN}✓ All services started${NC}"
echo
echo "To monitor logs:"
echo "  docker compose -f docker-compose.scale.yml logs -f auth-service-1 auth-service-2 auth-service-3"
echo "  docker compose -f docker-compose.scale.yml logs -f user-service-1 user-service-2"
echo "  docker compose -f docker-compose.scale.yml logs -f media-service-1 media-service-2"
echo
echo "To test load distribution:"
echo "  ./scripts/test-load-distribution.sh"
echo
echo "To stop all services:"
echo "  docker compose -f docker-compose.scale.yml down"

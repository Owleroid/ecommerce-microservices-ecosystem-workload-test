#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Stopping all services...${NC}"
cd "$(dirname "$0")/.."
docker-compose down

echo -e "${GREEN}All services stopped${NC}"
echo ""
echo -e "${YELLOW}To remove volumes (delete all data):${NC}"
echo -e "  docker-compose down -v"
echo ""

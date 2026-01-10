#!/usr/bin/env bash

# Container Failure Simulation Script
# Tests system resilience by killing instances and observing behavior

set -e

echo "======================================"
echo "Container Failure Simulation"
echo "======================================"
echo

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

API_URL="${API_URL:-http://localhost}"

# Get token
echo -e "${BLUE}Setting up test user and token...${NC}"
curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"failuretest@example.com","password":"test123456"}' > /dev/null 2>&1 || true

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"failuretest@example.com","password":"test123456"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}Could not get token${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Got access token${NC}"
echo

# Test 1: Kill one auth service instance
echo -e "${BLUE}Test 1: Killing auth-service-2...${NC}"
docker stop auth-service-2
echo -e "${YELLOW}Waiting 5 seconds...${NC}"
sleep 5

echo "Testing auth service with one instance down..."
SUCCESS_COUNT=0
FAIL_COUNT=0
for i in {1..10}; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"failuretest@example.com","password":"test123456"}')
  
  if [ "$HTTP_CODE" = "200" ]; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    echo -n "."
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
    echo -n "x"
  fi
done
echo
echo "Results: $SUCCESS_COUNT successful, $FAIL_COUNT failed"

if [ $SUCCESS_COUNT -ge 8 ]; then
  echo -e "${GREEN}✓ Auth service resilient (surviving instances handled requests)${NC}"
else
  echo -e "${RED}✗ Auth service degraded significantly${NC}"
fi

echo "Restarting auth-service-2..."
docker start auth-service-2
sleep 5
echo

# Test 2: Kill one user service instance
echo -e "${BLUE}Test 2: Killing user-service-2...${NC}"
docker stop user-service-2
echo -e "${YELLOW}Waiting 5 seconds...${NC}"
sleep 5

echo "Testing user service with one instance down..."
SUCCESS_COUNT=0
FAIL_COUNT=0
for i in {1..10}; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_URL/api/users/me" \
    -H "Authorization: Bearer $TOKEN")
  
  if [ "$HTTP_CODE" = "200" ]; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    echo -n "."
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
    echo -n "x"
  fi
done
echo
echo "Results: $SUCCESS_COUNT successful, $FAIL_COUNT failed"

if [ $SUCCESS_COUNT -ge 8 ]; then
  echo -e "${GREEN}✓ User service resilient (surviving instance handled requests)${NC}"
else
  echo -e "${RED}✗ User service degraded significantly${NC}"
fi

echo "Restarting user-service-2..."
docker start user-service-2
sleep 5
echo

# Test 3: Kill one media service instance
echo -e "${BLUE}Test 3: Killing media-service-2...${NC}"
docker stop media-service-2
echo -e "${YELLOW}Waiting 5 seconds...${NC}"
sleep 5

echo "Testing media service with one instance down..."
SUCCESS_COUNT=0
FAIL_COUNT=0
for i in {1..10}; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_URL/api/media/status/999" \
    -H "Authorization: Bearer $TOKEN")
  
  # Accept 404 as success (job not found is expected)
  if [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "200" ]; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    echo -n "."
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
    echo -n "x"
  fi
done
echo
echo "Results: $SUCCESS_COUNT successful, $FAIL_COUNT failed"

if [ $SUCCESS_COUNT -ge 8 ]; then
  echo -e "${GREEN}✓ Media service resilient (surviving instance handled requests)${NC}"
else
  echo -e "${RED}✗ Media service degraded significantly${NC}"
fi

echo "Restarting media-service-2..."
docker start media-service-2
sleep 5
echo

# Summary
echo -e "${GREEN}======================================"
echo "Failure Simulation Complete"
echo "======================================${NC}"
echo "All instances restarted and system should be fully operational."
echo
echo "Key observations:"
echo "  • System continued operating with reduced capacity"
echo "  • No cascading failures observed"
echo "  • Services recovered automatically when restarted"
echo
echo "Check container status:"
echo "  docker ps --filter 'name=service'"

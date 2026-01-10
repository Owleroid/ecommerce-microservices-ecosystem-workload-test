#!/usr/bin/env bash

# Load Distribution Test Script
# Makes multiple requests and shows which instance handled each request

set -e

echo "======================================"
echo "Load Distribution Test"
echo "======================================"
echo

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_URL="${API_URL:-http://localhost}"
NUM_REQUESTS="${NUM_REQUESTS:-20}"

# First, register and login to get a token
echo -e "${BLUE}Registering test user...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"loadtest@example.com","password":"test123456"}' 2>/dev/null || echo '{"error":"user may already exist"}')

echo -e "${BLUE}Logging in...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"loadtest@example.com","password":"test123456"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${YELLOW}Could not get token. Response: $LOGIN_RESPONSE${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Got access token${NC}"
echo

# Test 1: Auth Service Load Distribution
echo -e "${BLUE}Test 1: Auth Service (Login requests)${NC}"
echo "Making $NUM_REQUESTS login requests..."
declare -A auth_instances
for i in $(seq 1 $NUM_REQUESTS); do
  INSTANCE=$(curl -s -D - -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"loadtest@example.com","password":"test123456"}' 2>/dev/null | \
    grep -i "x-instance-id:" | cut -d' ' -f2 | tr -d '\r\n')
  
  if [ -n "$INSTANCE" ]; then
    auth_instances[$INSTANCE]=$((${auth_instances[$INSTANCE]:-0} + 1))
    echo -n "."
  fi
done
echo
echo "Auth service distribution:"
for instance in "${!auth_instances[@]}"; do
  echo "  $instance: ${auth_instances[$instance]} requests"
done
echo

# Test 2: User Service Load Distribution
echo -e "${BLUE}Test 2: User Service (Profile requests)${NC}"
echo "Making $NUM_REQUESTS profile requests..."
declare -A user_instances
for i in $(seq 1 $NUM_REQUESTS); do
  INSTANCE=$(curl -s -D - -X GET "$API_URL/api/users/me" \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null | \
    grep -i "x-instance-id:" | cut -d' ' -f2 | tr -d '\r\n')
  
  if [ -n "$INSTANCE" ]; then
    user_instances[$INSTANCE]=$((${user_instances[$INSTANCE]:-0} + 1))
    echo -n "."
  fi
done
echo
echo "User service distribution:"
for instance in "${!user_instances[@]}"; do
  echo "  $instance: ${user_instances[$instance]} requests"
done
echo

# Test 3: Media Service Load Distribution
echo -e "${BLUE}Test 3: Media Service (Status requests)${NC}"
echo "Making $NUM_REQUESTS media status requests..."
declare -A media_instances
for i in $(seq 1 $NUM_REQUESTS); do
  INSTANCE=$(curl -s -D - -X GET "$API_URL/api/media/status/999" \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null | \
    grep -i "x-instance-id:" | cut -d' ' -f2 | tr -d '\r\n')
  
  if [ -n "$INSTANCE" ]; then
    media_instances[$INSTANCE]=$((${media_instances[$INSTANCE]:-0} + 1))
    echo -n "."
  fi
done
echo
echo "Media service distribution:"
for instance in "${!media_instances[@]}"; do
  echo "  $instance: ${media_instances[$instance]} requests"
done
echo

# Summary
echo -e "${GREEN}======================================"
echo "Summary"
echo "======================================${NC}"
echo "Expected distribution for round-robin:"
echo "  Auth service (3 instances): ~33% each"
echo "  User service (2 instances): ~50% each"
echo "  Media service (2 instances): ~50% each"
echo
echo -e "${GREEN}✓ Load distribution test complete${NC}"
echo "Check the logs to verify requests were handled by different instances:"
echo "  docker-compose -f docker-compose.scale.yml logs -f | grep 'Request completed'"

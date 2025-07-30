#!/bin/bash
# Copyright 2025 ogt11.com, llc
# CertM3 Middleware Exact Replication Test

set -e

echo "CertM3 Middleware Exact Replication Test"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "OK")
            echo -e "${GREEN}✓${NC} $message"
            ;;
        "WARN")
            echo -e "${YELLOW}⚠${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}✗${NC} $message"
            ;;
    esac
}

# Check if we're in the right directory
if [ ! -f "etc/config.yaml" ] && [ ! -f "config.yaml" ] && [ ! -f "config/config.yaml" ]; then
    print_status "ERROR" "Configuration file not found. Run this script from the pkg directory."
    exit 1
fi

# Determine config file location
if [ -f "etc/config.yaml" ]; then
    CONFIG_FILE="etc/config.yaml"
elif [ -f "config.yaml" ]; then
    CONFIG_FILE="config.yaml"
else
    CONFIG_FILE="config/config.yaml"
fi

echo "Using config file: $CONFIG_FILE"

# Extract URLs from config
if command -v python3 &> /dev/null; then
    API_URL=$(python3 -c "import yaml; config=yaml.safe_load(open('$CONFIG_FILE')); print(config.get('app_server', {}).get('backend_baseurl', 'http://localhost:3000/api'))" 2>/dev/null)
    MIDDLEWARE_URL=$(python3 -c "import yaml; config=yaml.safe_load(open('$CONFIG_FILE')); print(config.get('app_server', {}).get('frontend_baseurl', 'http://localhost:8080/app'))" 2>/dev/null)
else
    API_URL="http://localhost:3000/api"
    MIDDLEWARE_URL="http://localhost:8080/app"
fi

echo "Testing API at: $API_URL"
echo "Testing Middleware at: $MIDDLEWARE_URL"

# Generate unique test data
TEST_USERNAME="testuser$(date +%s)"
TEST_EMAIL="${TEST_USERNAME}@test.com"
TEST_DISPLAY_NAME="Test User $(date +%s)"

echo "Using test data:"
echo "  Username: $TEST_USERNAME"
echo "  Email: $TEST_EMAIL"
echo "  Display Name: $TEST_DISPLAY_NAME"
echo ""

# Test 1: Create a request (like middleware does)
echo "1. Creating request (middleware step 1)..."
REQUEST_RESPONSE=$(curl -s -X POST "$MIDDLEWARE_URL/requests" \
  -H "Content-Type: application/json" \
  -H "User-Agent: Go-http-client/1.1" \
  -d "{
    \"username\": \"$TEST_USERNAME\",
    \"email\": \"$TEST_EMAIL\",
    \"displayName\": \"$TEST_DISPLAY_NAME\"
  }")

echo "Request creation response:"
echo "$REQUEST_RESPONSE"
echo ""

if echo "$REQUEST_RESPONSE" | grep -q '"id"'; then
    REQUEST_ID=$(echo "$REQUEST_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "unknown")
    print_status "OK" "Request created successfully (ID: $REQUEST_ID)"
else
    print_status "ERROR" "Request creation failed"
    exit 1
fi

# Test 2: Validate request (like middleware does)
echo ""
echo "2. Validating request (middleware step 2)..."
VALIDATION_RESPONSE=$(curl -s -X POST "$MIDDLEWARE_URL/requests/$REQUEST_ID/validate" \
  -H "Content-Type: application/json" \
  -H "User-Agent: Go-http-client/1.1" \
  -d "{
    \"challengeToken\": \"test-challenge-$(date +%s)\"
  }")

echo "Validation response:"
echo "$VALIDATION_RESPONSE"
echo ""

# Check if response is JSON or plain text
if echo "$VALIDATION_RESPONSE" | grep -q '^{.*}$'; then
    print_status "OK" "Middleware returned JSON response"
    if echo "$VALIDATION_RESPONSE" | grep -q '"token"'; then
        print_status "OK" "Request validation successful"
    else
        print_status "WARN" "Request validation failed but returned JSON"
    fi
else
    print_status "ERROR" "Middleware returned plain text instead of JSON"
    echo "This confirms the middleware error handling issue"
fi

# Test 3: Direct API call (exactly like middleware does)
echo ""
echo "3. Direct API call (exactly like middleware does)..."
GROUP_DATA="{
  \"name\": \"$TEST_USERNAME\",
  \"displayName\": \"$TEST_USERNAME's Group\",
  \"description\": \"Personal group for $TEST_USERNAME\"
}"

echo "Group data being sent:"
echo "$GROUP_DATA"
echo ""

# Make the exact same call the middleware makes
API_RESPONSE=$(curl -s -X POST "$API_URL/groups" \
  -H "Content-Type: application/json" \
  -H "User-Agent: Go-http-client/1.1" \
  -d "$GROUP_DATA")

echo "API response:"
echo "$API_RESPONSE"
echo ""

# Check response status and content
if echo "$API_RESPONSE" | grep -q '"name"'; then
    print_status "OK" "API group creation successful"
else
    print_status "ERROR" "API group creation failed"
    echo "This is the root cause - the API is failing to create groups"
fi

# Test 4: Check what nginx is doing to the response
echo ""
echo "4. Testing nginx proxy behavior..."
NGINX_RESPONSE=$(curl -s -X POST "$API_URL/groups" \
  -H "Content-Type: application/json" \
  -H "User-Agent: Go-http-client/1.1" \
  -H "X-Real-IP: 127.0.0.1" \
  -H "X-Forwarded-For: 127.0.0.1" \
  -H "X-Forwarded-Proto: https" \
  -d "$GROUP_DATA" \
  -w "\nHTTP_STATUS: %{http_code}\nCONTENT_TYPE: %{content_type}\n")

echo "Nginx proxy response:"
echo "$NGINX_RESPONSE"
echo ""

# Test 5: Test with different content types
echo ""
echo "5. Testing with different content types..."
ERROR_RESPONSE=$(curl -s -X POST "$API_URL/groups" \
  -H "Content-Type: application/json" \
  -H "User-Agent: Go-http-client/1.1" \
  -d "{
    \"invalid\": \"data\"
  }")

echo "Error response:"
echo "$ERROR_RESPONSE"
echo ""

echo ""
print_status "OK" "Middleware exact replication test completed!"
echo ""
echo "Key findings:"
echo "1. If API fails but middleware returns JSON, nginx is working correctly"
echo "2. If middleware returns plain text, nginx CORS headers might be interfering"
echo "3. If API succeeds but middleware fails, there's a middleware logic issue"
echo "4. The exact error response format will help identify the root cause" 
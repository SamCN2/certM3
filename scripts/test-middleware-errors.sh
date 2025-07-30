#!/bin/bash
# Copyright 2025 ogt11.com, llc
# CertM3 Middleware Error Handling Test

set -e

echo "CertM3 Middleware Error Handling Test"
echo "====================================="

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

# Extract middleware URL from config
if command -v python3 &> /dev/null; then
    MIDDLEWARE_URL=$(python3 -c "import yaml; config=yaml.safe_load(open('$CONFIG_FILE')); print(config.get('app_server', {}).get('frontend_baseurl', 'http://localhost:8080/app'))" 2>/dev/null)
else
    MIDDLEWARE_URL="http://localhost:8080/app"
fi

echo "Testing middleware at: $MIDDLEWARE_URL"

# Generate unique test data
TEST_USERNAME="testuser$(date +%s)"
TEST_EMAIL="${TEST_USERNAME}@test.com"
TEST_DISPLAY_NAME="Test User $(date +%s)"

echo "Using test data:"
echo "  Username: $TEST_USERNAME"
echo "  Email: $TEST_EMAIL"
echo "  Display Name: $TEST_DISPLAY_NAME"
echo ""

# Test 1: Check middleware health
echo "1. Testing middleware health..."
HEALTH_RESPONSE=$(curl -s "$MIDDLEWARE_URL/health" 2>/dev/null || echo "Connection failed")
if echo "$HEALTH_RESPONSE" | grep -q "ok\|healthy\|status"; then
    print_status "OK" "Middleware health check responding"
else
    print_status "WARN" "Middleware health check failed or unexpected response"
    echo "Response: $HEALTH_RESPONSE"
fi

# Test 2: Test username availability (should work)
echo ""
echo "2. Testing username availability..."
USERNAME_RESPONSE=$(curl -s "$MIDDLEWARE_URL/check-username/$TEST_USERNAME" 2>/dev/null || echo "Connection failed")
if echo "$USERNAME_RESPONSE" | grep -q '"available"'; then
    print_status "OK" "Username availability endpoint working"
else
    print_status "WARN" "Username availability endpoint failed or unexpected response"
    echo "Response: $USERNAME_RESPONSE"
fi

# Test 3: Test request creation (should work)
echo ""
echo "3. Testing request creation..."
REQUEST_RESPONSE=$(curl -s -X POST "$MIDDLEWARE_URL/requests" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$TEST_USERNAME\",
    \"email\": \"$TEST_EMAIL\",
    \"displayName\": \"$TEST_DISPLAY_NAME\"
  }" 2>/dev/null || echo "Connection failed")

if echo "$REQUEST_RESPONSE" | grep -q '"id"'; then
    REQUEST_ID=$(echo "$REQUEST_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "unknown")
    print_status "OK" "Request created successfully (ID: $REQUEST_ID)"
else
    print_status "WARN" "Request creation failed or unexpected response"
    echo "Response: $REQUEST_RESPONSE"
    REQUEST_ID="unknown"
fi

# Test 4: Test request validation (this is where the error occurs)
echo ""
echo "4. Testing request validation (this should trigger the group creation error)..."
VALIDATION_RESPONSE=$(curl -s -X POST "$MIDDLEWARE_URL/requests/$REQUEST_ID/validate" \
  -H "Content-Type: application/json" \
  -d "{
    \"challengeToken\": \"test-challenge-$(date +%s)\"
  }" 2>/dev/null || echo "Connection failed")

# Check if response is JSON or plain text
if echo "$VALIDATION_RESPONSE" | grep -q '^{.*}$'; then
    print_status "OK" "Middleware returned JSON response (good)"
    if echo "$VALIDATION_RESPONSE" | grep -q '"token"'; then
        print_status "OK" "Request validation successful"
    else
        print_status "WARN" "Request validation failed but returned JSON"
        echo "Response: $VALIDATION_RESPONSE"
    fi
else
    print_status "ERROR" "Middleware returned plain text instead of JSON (BAD!)"
    echo "Response: $VALIDATION_RESPONSE"
    echo ""
    echo "This is the exact problem we're looking for!"
    echo "The middleware should return JSON errors, not plain text."
fi

# Test 5: Test direct API group creation to isolate the issue
echo ""
echo "5. Testing direct API group creation..."
API_URL=$(python3 -c "import yaml; config=yaml.safe_load(open('$CONFIG_FILE')); print(config.get('app_server', {}).get('backend_baseurl', 'http://localhost:3000/api'))" 2>/dev/null || echo "http://localhost:3000/api")

GROUP_CREATE_RESPONSE=$(curl -s -X POST "$API_URL/groups" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"test-group-$(date +%s)\",
    \"displayName\": \"Test Group\",
    \"description\": \"Test group for debugging\",
    \"status\": \"active\"
  }" 2>/dev/null || echo "Connection failed")

if echo "$GROUP_CREATE_RESPONSE" | grep -q '"name"'; then
    print_status "OK" "Direct API group creation successful"
else
    print_status "ERROR" "Direct API group creation failed"
    echo "Response: $GROUP_CREATE_RESPONSE"
    echo ""
    echo "This confirms the API group creation is failing."
    echo "The middleware error is caused by the API failure."
fi

echo ""
print_status "OK" "Middleware error handling test completed!"
echo ""
echo "Key findings:"
echo "1. If middleware returns plain text instead of JSON, that's the immediate problem"
echo "2. If API group creation fails, that's the root cause"
echo "3. Both issues need to be fixed for proper error handling" 
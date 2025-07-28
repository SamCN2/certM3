#!/bin/bash
# Copyright 2025 ogt11.com, llc
# CertM3 API Flow Test Script

set -e

echo "CertM3 API Flow Test"
echo "===================="

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

# Extract API URL from config
if command -v python3 &> /dev/null; then
    API_URL=$(python3 -c "import yaml; config=yaml.safe_load(open('$CONFIG_FILE')); print(config.get('api', {}).get('backend_baseurl', 'http://localhost:3000/api'))" 2>/dev/null)
else
    API_URL="http://localhost:3000/api"
fi

echo "Testing API at: $API_URL"

# Generate unique test data
TEST_USERNAME="testuser$(date +%s)"
TEST_EMAIL="${TEST_USERNAME}@test.com"
TEST_DISPLAY_NAME="Test User $(date +%s)"

echo "Using test data:"
echo "  Username: $TEST_USERNAME"
echo "  Email: $TEST_EMAIL"
echo "  Display Name: $TEST_DISPLAY_NAME"
echo ""

# Test 1: Check username availability
echo "1. Testing username availability..."
if curl -s "$API_URL/request/check-username/$TEST_USERNAME" >/dev/null 2>&1; then
    print_status "OK" "Username availability endpoint responding"
else
    print_status "ERROR" "Username availability endpoint failed"
    exit 1
fi

# Test 2: Create a request
echo ""
echo "2. Testing request creation..."
REQUEST_RESPONSE=$(curl -s -X POST "$API_URL/requests" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$TEST_USERNAME\",
    \"email\": \"$TEST_EMAIL\",
    \"displayName\": \"$TEST_DISPLAY_NAME\"
  }")

if echo "$REQUEST_RESPONSE" | grep -q '"id"'; then
    REQUEST_ID=$(echo "$REQUEST_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
    print_status "OK" "Request created successfully (ID: $REQUEST_ID)"
else
    print_status "ERROR" "Request creation failed"
    echo "Response: $REQUEST_RESPONSE"
    exit 1
fi

# Test 3: Validate the request (this triggers group creation)
echo ""
echo "3. Testing request validation (this should trigger group creation)..."
VALIDATION_RESPONSE=$(curl -s -X POST "$API_URL/requests/$REQUEST_ID/validate" \
  -H "Content-Type: application/json" \
  -d "{
    \"challengeToken\": \"test-challenge-$(date +%s)\"
  }")

if echo "$VALIDATION_RESPONSE" | grep -q '"token"'; then
    print_status "OK" "Request validation successful"
else
    print_status "ERROR" "Request validation failed"
    echo "Response: $VALIDATION_RESPONSE"
    echo ""
    echo "This is likely the Group creation error we're looking for!"
    echo "Check the API logs for the exact error message."
    exit 1
fi

# Test 4: Check if group was created
echo ""
echo "4. Testing group creation..."
GROUP_RESPONSE=$(curl -s "$API_URL/groups")

if echo "$GROUP_RESPONSE" | grep -q "\"name\":\"$TEST_USERNAME\""; then
    print_status "OK" "Group created successfully for user"
else
    print_status "WARN" "Group not found for user (this might be expected)"
    echo "Available groups:"
    echo "$GROUP_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); [print(f'  - {g[\"name\"]}') for g in data]" 2>/dev/null || echo "  (Could not parse groups response)"
fi

# Test 5: Test direct group creation (the failing operation)
echo ""
echo "5. Testing direct group creation (the operation that's failing)..."
GROUP_CREATE_RESPONSE=$(curl -s -X POST "$API_URL/groups" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"test-group-$(date +%s)\",
    \"displayName\": \"Test Group\",
    \"description\": \"Test group for debugging\",
    \"status\": \"active\"
  }")

if echo "$GROUP_CREATE_RESPONSE" | grep -q '"name"'; then
    print_status "OK" "Direct group creation successful"
else
    print_status "ERROR" "Direct group creation failed"
    echo "Response: $GROUP_CREATE_RESPONSE"
    echo ""
    echo "This is the exact error we're looking for!"
    echo "The Group model is failing to create due to missing timestamps."
    exit 1
fi

echo ""
print_status "OK" "All API flow tests completed successfully!"
echo ""
echo "If any test failed, check the API logs for the exact error message."
echo "The most likely issue is the Group model missing timestamp auto-generation." 
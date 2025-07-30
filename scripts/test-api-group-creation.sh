#!/bin/bash
# Copyright 2025 ogt11.com, llc
# CertM3 API Group Creation Debug Test

set -e

echo "CertM3 API Group Creation Debug Test"
echo "===================================="

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
TEST_GROUP_NAME="test-group-$(date +%s)"
TEST_DISPLAY_NAME="Test Group $(date +%s)"

echo "Using test data:"
echo "  Group Name: $TEST_GROUP_NAME"
echo "  Display Name: $TEST_DISPLAY_NAME"
echo ""

# Test 1: Check API health
echo "1. Testing API health..."
HEALTH_RESPONSE=$(curl -s "$API_URL/ping" 2>/dev/null || echo "Connection failed")
if echo "$HEALTH_RESPONSE" | grep -q "greeting\|pong"; then
    print_status "OK" "API health check responding"
else
    print_status "WARN" "API health check failed or unexpected response"
    echo "Response: $HEALTH_RESPONSE"
fi

# Test 2: Test group creation with minimal data
echo ""
echo "2. Testing group creation with minimal data..."
MINIMAL_RESPONSE=$(curl -s -X POST "$API_URL/groups" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$TEST_GROUP_NAME\",
    \"displayName\": \"$TEST_DISPLAY_NAME\"
  }" 2>/dev/null || echo "Connection failed")

echo "Minimal group creation response:"
echo "$MINIMAL_RESPONSE"
echo ""

if echo "$MINIMAL_RESPONSE" | grep -q '"name"'; then
    print_status "OK" "Minimal group creation successful"
else
    print_status "ERROR" "Minimal group creation failed"
    echo "This suggests a basic validation or model issue"
fi

# Test 3: Test group creation with full data
echo ""
echo "3. Testing group creation with full data..."
FULL_RESPONSE=$(curl -s -X POST "$API_URL/groups" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"full-group-$(date +%s)\",
    \"displayName\": \"Full Test Group\",
    \"description\": \"Test group with full data\",
    \"status\": \"active\"
  }" 2>/dev/null || echo "Connection failed")

echo "Full group creation response:"
echo "$FULL_RESPONSE"
echo ""

if echo "$FULL_RESPONSE" | grep -q '"name"'; then
    print_status "OK" "Full group creation successful"
else
    print_status "ERROR" "Full group creation failed"
    echo "This suggests a data validation issue"
fi

# Test 4: Test group creation with explicit timestamps
echo ""
echo "4. Testing group creation with explicit timestamps..."
TIMESTAMP_RESPONSE=$(curl -s -X POST "$API_URL/groups" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"timestamp-group-$(date +%s)\",
    \"displayName\": \"Timestamp Test Group\",
    \"description\": \"Test group with explicit timestamps\",
    \"status\": \"active\",
    \"createdAt\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",
    \"updatedAt\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\"
  }" 2>/dev/null || echo "Connection failed")

echo "Timestamp group creation response:"
echo "$TIMESTAMP_RESPONSE"
echo ""

if echo "$TIMESTAMP_RESPONSE" | grep -q '"name"'; then
    print_status "OK" "Timestamp group creation successful"
else
    print_status "ERROR" "Timestamp group creation failed"
    echo "This suggests the timestamp auto-generation is the issue"
fi

# Test 5: Check existing groups
echo ""
echo "5. Checking existing groups..."
GROUPS_RESPONSE=$(curl -s "$API_URL/groups" 2>/dev/null || echo "Connection failed")

echo "Existing groups response:"
echo "$GROUPS_RESPONSE"
echo ""

if echo "$GROUPS_RESPONSE" | grep -q '"name"'; then
    print_status "OK" "Groups endpoint responding"
    GROUP_COUNT=$(echo "$GROUPS_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data))" 2>/dev/null || echo "unknown")
    echo "Found $GROUP_COUNT existing groups"
else
    print_status "WARN" "Groups endpoint failed or unexpected response"
fi

# Test 6: Test database connectivity via API
echo ""
echo "6. Testing database connectivity via API..."
DB_TEST_RESPONSE=$(curl -s "$API_URL/users" 2>/dev/null || echo "Connection failed")

if echo "$DB_TEST_RESPONSE" | grep -q '"id"'; then
    print_status "OK" "Database connectivity confirmed via users endpoint"
else
    print_status "WARN" "Database connectivity test failed"
    echo "Response: $DB_TEST_RESPONSE"
fi

echo ""
print_status "OK" "API group creation debug test completed!"
echo ""
echo "Analysis:"
echo "1. If minimal group creation fails, it's a basic model/validation issue"
echo "2. If full group creation fails, it's a data validation issue"
echo "3. If timestamp group creation works, the auto-generation is the problem"
echo "4. If all fail, there's a fundamental API or database issue" 
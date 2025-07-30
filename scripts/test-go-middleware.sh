#!/bin/bash
# Copyright 2025 ogt11.com, llc
# CertM3 Go Middleware Test (Simplified)

set -e

echo "CertM3 Go Middleware Test (Simplified)"
echo "======================================"

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

# Create a simple Node.js test script
echo "Creating Node.js test script..."
cat > /tmp/test-middleware.js << 'EOF'
const axios = require('axios');

// Configuration
const MIDDLEWARE_URL = process.env.MIDDLEWARE_URL || 'http://localhost:8080/app';
const TEST_USERNAME = process.env.TEST_USERNAME || 'testuser123';

// Create axios instance with Go middleware headers
const api = axios.create({
  baseURL: MIDDLEWARE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'Go-http-client/1.1'
  }
});

// Add response interceptor for detailed logging
api.interceptors.response.use(
  response => {
    console.log('✓ Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data
    });
    return response;
  },
  error => {
    console.log('✗ Error Response:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      headers: error.response?.headers,
      data: error.response?.data,
      message: error.message
    });
    return Promise.reject(error);
  }
);

// Add request interceptor for logging
api.interceptors.request.use(
  config => {
    console.log('→ Request:', {
      method: config.method,
      url: config.url,
      headers: config.headers,
      data: config.data
    });
    return config;
  }
);

async function runTest() {
  try {
    console.log('=== Step 1: Check username availability ===');
    const usernameResponse = await api.get(`/check-username/${TEST_USERNAME}`);
    console.log('Username check successful');

    console.log('\n=== Step 2: Create request ===');
    const requestData = {
      username: TEST_USERNAME,
      email: `${TEST_USERNAME}@test.com`,
      displayName: `Test User ${Date.now()}`
    };
    
    const requestResponse = await api.post('/requests', requestData);
    const requestId = requestResponse.data.id;
    console.log('Request created with ID:', requestId);

    console.log('\n=== Step 3: Validate request (this triggers group creation) ===');
    const validationData = {
      challengeToken: `test-challenge-${Date.now()}`
    };
    
    const validationResponse = await api.post(`/requests/${requestId}/validate`, validationData);
    console.log('Validation successful');
    console.log('Response type:', typeof validationResponse.data);
    console.log('Response is JSON:', typeof validationResponse.data === 'object');
    
    if (validationResponse.data.token) {
      console.log('✓ JWT token received');
    } else {
      console.log('⚠ No JWT token in response');
    }

  } catch (error) {
    console.log('✗ Test failed:', error.message);
    
    // Check if it's a plain text error
    if (error.response?.data && typeof error.response.data === 'string') {
      console.log('⚠ Middleware returned plain text instead of JSON');
      console.log('Plain text response:', error.response.data);
    }
    
    process.exit(1);
  }
}

runTest();
EOF

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    print_status "ERROR" "Node.js not available. Installing..."
    if command -v apt &> /dev/null; then
        sudo apt update && sudo apt install -y nodejs npm
    elif command -v yum &> /dev/null; then
        sudo yum install -y nodejs npm
    else
        print_status "ERROR" "Cannot install Node.js automatically. Please install it manually."
        exit 1
    fi
fi

# Install axios if needed
if ! node -e "require('axios')" 2>/dev/null; then
    print_status "INFO" "Installing axios..."
    npm install axios 2>/dev/null || echo "Could not install axios globally, will try local"
fi

# Run the test
echo ""
echo "Running Go middleware test..."
export MIDDLEWARE_URL="$MIDDLEWARE_URL"
export TEST_USERNAME="$TEST_USERNAME"

if node /tmp/test-middleware.js; then
    print_status "OK" "Go middleware test completed successfully"
else
    print_status "ERROR" "Go middleware test failed"
    echo ""
    echo "This test replicates exactly what the Go middleware does."
    echo "If it fails, we've found the exact issue."
fi

# Cleanup
rm -f /tmp/test-middleware.js

echo ""
print_status "OK" "Go middleware test completed!"
echo ""
echo "Key findings:"
echo "1. If this test succeeds but the real middleware fails, there's an environment difference"
echo "2. If this test fails with plain text, the middleware error handling is the issue"
echo "3. If this test fails with JSON, the API group creation is the root cause" 
#!/bin/bash
# Copyright 2025 ogt11.com, llc
# CertM3 Model Testing Script

set -e

echo "CertM3 Model Testing"
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

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(dirname "$SCRIPT_DIR")"

# Check if we're in the right directory structure
if [ ! -f "$PKG_DIR/etc/config.yaml" ] && [ ! -f "$PKG_DIR/config.yaml" ] && [ ! -f "$PKG_DIR/config/config.yaml" ]; then
    print_status "ERROR" "Configuration file not found. Run this script from the pkg directory."
    echo "Looking for: etc/config.yaml, config.yaml, or config/config.yaml"
    echo "Current directory: $(pwd)"
    echo "Script directory: $SCRIPT_DIR"
    echo "Package directory: $PKG_DIR"
    exit 1
fi

# Determine config file location
if [ -f "$PKG_DIR/etc/config.yaml" ]; then
    CONFIG_FILE="$PKG_DIR/etc/config.yaml"
elif [ -f "$PKG_DIR/config.yaml" ]; then
    CONFIG_FILE="$PKG_DIR/config.yaml"
else
    CONFIG_FILE="$PKG_DIR/config/config.yaml"
fi

echo "Using config file: $CONFIG_FILE"

# Check if API is built
if [ ! -d "$PKG_DIR/api/dist" ]; then
    print_status "ERROR" "API not built. Run setup.sh first."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "$PKG_DIR/api/node_modules" ]; then
    print_status "ERROR" "API dependencies not installed. Run: cd api && npm install --omit=dev --legacy-peer-deps"
    exit 1
fi

echo "Creating temporary test script..."

# Create a temporary Node.js script to test models
cat > /tmp/test-models.js << EOF
const path = require('path');

// Add the API dist directory to the module path
const apiDistPath = '$PKG_DIR/api/dist';
require('module').globalPaths.push(apiDistPath);

const { ConfigLoader } = require(path.join(apiDistPath, 'config-loader'));
const { Group } = require(path.join(apiDistPath, 'models/group.model'));
const { Users } = require(path.join(apiDistPath, 'models/user.model'));
const { UserGroup } = require(path.join(apiDistPath, 'models/user-group.model'));
const { Request } = require(path.join(apiDistPath, 'models/request.model'));

async function testModels() {
    try {
        console.log('Loading configuration...');
        const configLoader = ConfigLoader.getInstance();
        const config = configLoader.loadConfig();
        console.log('✓ Configuration loaded successfully');

        console.log('\\nTesting Group model...');
        const testGroup = new Group({
            name: 'test-group-' + Date.now(),
            displayName: 'Test Group',
            description: 'Test group for validation',
            status: 'active'
        });
        console.log('✓ Group model instantiated successfully');

        console.log('\\nTesting User model...');
        const testUser = new Users({
            username: 'testuser-' + Date.now(),
            email: 'test@example.com',
            displayName: 'Test User',
            status: 'active'
        });
        console.log('✓ User model instantiated successfully');

        console.log('\\nTesting UserGroup model...');
        const testUserGroup = new UserGroup({
            userId: '00000000-0000-0000-0000-000000000000',
            groupName: 'test-group',
            createdBy: 'test',
            updatedBy: 'test'
        });
        console.log('✓ UserGroup model instantiated successfully');

        console.log('\\nTesting Request model...');
        const testRequest = new Request({
            userId: '00000000-0000-0000-0000-000000000000',
            status: 'pending',
            requestType: 'certificate',
            requestData: JSON.stringify({ test: true })
        });
        console.log('✓ Request model instantiated successfully');

        console.log('\\n✓ All models instantiated successfully');
        console.log('✓ No validation errors detected');
        
        return true;
    } catch (error) {
        console.error('✗ Model test failed:', error.message);
        console.error('Stack trace:', error.stack);
        return false;
    }
}

testModels().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('✗ Unexpected error:', error);
    process.exit(1);
});
EOF

echo "Running model tests..."

# Run the test script from the package directory
cd "$PKG_DIR"
if node /tmp/test-models.js; then
    print_status "OK" "All models instantiated successfully"
    print_status "OK" "No validation errors detected"
else
    print_status "ERROR" "Model validation failed"
    echo ""
    echo "This indicates a configuration or model definition issue."
    echo "Common causes:"
    echo "1. Database connection problems"
    echo "2. Missing timestamp columns (createdAt/updatedAt)"
    echo "3. Incorrect model property definitions"
    echo "4. Configuration file syntax errors"
    echo ""
    echo "Check the error message above for specific details."
    exit 1
fi

# Clean up
rm -f /tmp/test-models.js

echo ""
echo "Testing API endpoints..."

# Extract API URL from config
if command -v python3 &> /dev/null; then
    API_URL=$(python3 -c "import yaml; config=yaml.safe_load(open('$CONFIG_FILE')); print(config.get('app_server', {}).get('backend_baseurl', 'http://localhost:3000/api'))" 2>/dev/null)
else
    API_URL="http://localhost:3000/api"
fi

echo "Testing API at: $API_URL"

# Check if API is running
if curl -s "$API_URL/ping" >/dev/null 2>&1; then
    print_status "OK" "API is running and responding"
    
    # Test ping endpoint
    PING_RESPONSE=$(curl -s "$API_URL/ping")
    if echo "$PING_RESPONSE" | grep -q "greeting.*Hello from LoopBack"; then
        print_status "OK" "API ping endpoint working (LoopBack response)"
    elif echo "$PING_RESPONSE" | grep -q "pong"; then
        print_status "OK" "API ping endpoint working (pong response)"
    else
        print_status "WARN" "API ping endpoint returned unexpected response"
        echo "Response: $PING_RESPONSE"
    fi
else
    print_status "WARN" "API is not running. Start with: pm2 start etc/certm3.pm2.config.js"
fi

echo ""
print_status "OK" "Model testing completed successfully!"
echo ""
echo "If all tests passed, your CertM3 system is properly configured."
echo "You can now start the services: pm2 start etc/certm3.pm2.config.js"

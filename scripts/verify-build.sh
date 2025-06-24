#!/bin/bash
# verify-build.sh: Verify that CertM3 can be built on a fresh machine
# This script checks all dependencies and builds all components

set -e

echo "=== CertM3 Build Verification ==="
echo "This script verifies that all components can be built on a fresh machine."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    local status=$1
    local message=$2
    if [ "$status" = "OK" ]; then
        echo -e "${GREEN}✓${NC} $message"
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}⚠${NC} $message"
    else
        echo -e "${RED}✗${NC} $message"
        exit 1
    fi
}

# Function to check command exists
check_command() {
    local cmd=$1
    local name=$2
    if command -v "$cmd" >/dev/null 2>&1; then
        print_status "OK" "$name is available"
        return 0
    else
        print_status "FAIL" "$name is not available"
        return 1
    fi
}

# Function to check directory exists
check_directory() {
    local dir=$1
    local name=$2
    if [ -d "$dir" ]; then
        print_status "OK" "$name directory exists"
        return 0
    else
        print_status "FAIL" "$name directory missing"
        return 1
    fi
}

echo "=== 1. Checking Prerequisites ==="

# Check system requirements
check_command "go" "Go"
check_command "node" "Node.js"
check_command "npm" "npm"
check_command "openssl" "OpenSSL"
check_command "git" "Git"

# Check Go version
GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
echo -e "${GREEN}✓${NC} Go version: $GO_VERSION"

# Check Node.js version
NODE_VERSION=$(node --version)
echo -e "${GREEN}✓${NC} Node.js version: $NODE_VERSION"

echo ""
echo "=== 2. Checking Project Structure ==="

# Check essential directories
check_directory "src/api" "API"
check_directory "src/mw" "Middleware"
check_directory "src/web" "Web Frontend"
check_directory "CA-mgmt" "CA Management"
check_directory "Install" "Installation Guides"

echo ""
echo "=== 3. Checking Source Files ==="

# Check essential source files
if [ -f "src/mw/cmd/certm3-app/main.go" ]; then
    print_status "OK" "certm3-app main.go exists"
else
    print_status "FAIL" "certm3-app main.go missing"
fi

if [ -f "src/mw/cmd/certm3-signer/main.go" ]; then
    print_status "OK" "certm3-signer main.go exists"
else
    print_status "FAIL" "certm3-signer main.go missing"
fi

if [ -f "src/api/src/datasources/postgres.datasource.ts" ]; then
    print_status "OK" "PostgreSQL datasource exists"
else
    print_status "FAIL" "PostgreSQL datasource missing"
fi

if [ -f "scripts/create_certm3_schema.sql" ]; then
    print_status "OK" "Database schema exists"
else
    print_status "FAIL" "Database schema missing"
fi

echo ""
echo "=== 4. Building Components ==="

# Build middleware
echo "Building middleware..."
cd src/mw
if go build -o bin/certm3-app cmd/certm3-app/main.go; then
    print_status "OK" "certm3-app built successfully"
else
    print_status "FAIL" "certm3-app build failed"
fi

if go build -o bin/certm3-signer cmd/certm3-signer/main.go; then
    print_status "OK" "certm3-signer built successfully"
else
    print_status "FAIL" "certm3-signer build failed"
fi
cd ../..

# Build API (if package.json exists)
if [ -f "src/api/package.json" ]; then
    echo "Building API..."
    cd src/api
    if npm install; then
        print_status "OK" "API dependencies installed"
    else
        print_status "FAIL" "API dependencies installation failed"
    fi
    cd ../..
else
    print_status "WARN" "API package.json not found, skipping API build"
fi

# Build web frontend (if package.json exists)
if [ -f "src/web/package.json" ]; then
    echo "Building web frontend..."
    cd src/web
    if npm install; then
        print_status "OK" "Web frontend dependencies installed"
    else
        print_status "FAIL" "Web frontend dependencies installation failed"
    fi
    cd ../..
else
    print_status "WARN" "Web frontend package.json not found, skipping web build"
fi

echo ""
echo "=== 5. Checking Configuration Files ==="

# Check configuration files
if [ -f "src/mw/config.yaml.example" ]; then
    print_status "OK" "Middleware config example exists"
else
    print_status "FAIL" "Middleware config example missing"
fi

if [ -f "CA-mgmt/config/openssl-root.conf" ]; then
    print_status "OK" "CA management config exists"
else
    print_status "FAIL" "CA management config missing"
fi

if [ -f "Install/database-setup.md" ]; then
    print_status "OK" "Database setup guide exists"
else
    print_status "FAIL" "Database setup guide missing"
fi

echo ""
echo "=== 6. Testing CA Management Scripts ==="

# Test CA management scripts
cd CA-mgmt
if [ -x "root/yubikey-create-root-ca.sh" ]; then
    print_status "OK" "Yubikey CA creation script is executable"
else
    print_status "FAIL" "Yubikey CA creation script not executable"
fi

if [ -x "root/create-root-ca.sh" ]; then
    print_status "OK" "OpenSSL CA creation script is executable"
else
    print_status "FAIL" "OpenSSL CA creation script not executable"
fi

if [ -x "monitoring/check-expiration.sh" ]; then
    print_status "OK" "Certificate monitoring script is executable"
else
    print_status "FAIL" "Certificate monitoring script not executable"
fi
cd ..

echo ""
echo "=== 7. Checking Documentation ==="

# Check documentation
if [ -f "README.md" ]; then
    print_status "OK" "Main README exists"
else
    print_status "FAIL" "Main README missing"
fi

if [ -f "CA-mgmt/README.md" ]; then
    print_status "OK" "CA management README exists"
else
    print_status "FAIL" "CA management README missing"
fi

if [ -f "CA-mgmt/INTEGRATION.md" ]; then
    print_status "OK" "CA integration guide exists"
else
    print_status "FAIL" "CA integration guide missing"
fi

echo ""
echo "=== Build Verification Complete ==="
echo ""
echo "If all checks passed, the system should be ready for deployment."
echo "Next steps:"
echo "1. Set up PostgreSQL database (see Install/database-setup.md)"
echo "2. Configure CA management (see CA-mgmt/README.md)"
echo "3. Configure middleware (see src/mw/config.yaml.example)"
echo "4. Start services"
echo ""
echo "For detailed setup instructions, see the documentation in each component directory." 
#!/bin/bash
# Copyright 2025 ogt11.com, llc
# CertM3 Configuration Validation Script

set -e

echo "CertM3 Configuration Validation"
echo "==============================="

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
if [ ! -f "etc/config.yaml" ]; then
    print_status "ERROR" "Configuration file not found. Run this script from the pkg directory."
    exit 1
fi

print_status "OK" "Configuration file found"

# Check config file syntax
echo ""
echo "Validating configuration file syntax..."
if command -v python3 &> /dev/null; then
    if python3 -c "import yaml; yaml.safe_load(open('etc/config.yaml'))" 2>/dev/null; then
        print_status "OK" "Configuration file syntax is valid"
    else
        print_status "ERROR" "Configuration file has syntax errors"
        exit 1
    fi
elif command -v python &> /dev/null; then
    if python -c "import yaml; yaml.safe_load(open('etc/config.yaml'))" 2>/dev/null; then
        print_status "OK" "Configuration file syntax is valid"
    else
        print_status "ERROR" "Configuration file has syntax errors"
        exit 1
    fi
else
    print_status "WARN" "Python not available, skipping YAML syntax validation"
fi

# Check required directories
echo ""
echo "Checking required directories..."
REQUIRED_DIRS=("var/spool/certM3/logs" "bin" "etc" "api")

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        print_status "OK" "Directory exists: $dir"
    else
        print_status "ERROR" "Missing required directory: $dir"
        exit 1
    fi
done

# Check required files
echo ""
echo "Checking required files..."
REQUIRED_FILES=("etc/config.yaml" "etc/certm3.pm2.config.js" "bin/certm3-app" "bin/certm3-signer")

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_status "OK" "File exists: $file"
    else
        print_status "ERROR" "Missing required file: $file"
        exit 1
    fi
done

# Check file permissions
echo ""
echo "Checking file permissions..."
if [ -r "etc/config.yaml" ]; then
    print_status "OK" "Configuration file is readable"
else
    print_status "ERROR" "Configuration file is not readable"
    exit 1
fi

if [ -x "bin/certm3-app" ] && [ -x "bin/certm3-signer" ]; then
    print_status "OK" "Binary files are executable"
else
    print_status "ERROR" "Binary files are not executable"
    exit 1
fi

# Check log directory permissions
if [ -w "var/spool/certM3/logs" ]; then
    print_status "OK" "Log directory is writable"
else
    print_status "ERROR" "Log directory is not writable"
    exit 1
fi

# Check system dependencies
echo ""
echo "Checking system dependencies..."
MISSING_DEPS=()

if ! command -v node &> /dev/null; then
    MISSING_DEPS+=("Node.js")
fi

if ! command -v npm &> /dev/null; then
    MISSING_DEPS+=("npm")
fi

if ! command -v pm2 &> /dev/null; then
    MISSING_DEPS+=("PM2")
fi

if ! command -v psql &> /dev/null; then
    MISSING_DEPS+=("PostgreSQL client")
fi

if [ ${#MISSING_DEPS[@]} -eq 0 ]; then
    print_status "OK" "All system dependencies found"
else
    print_status "ERROR" "Missing dependencies: ${MISSING_DEPS[*]}"
    echo "Please install missing dependencies before continuing."
    exit 1
fi

# Check Node.js version
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        print_status "OK" "Node.js version $(node --version) is compatible"
    else
        print_status "ERROR" "Node.js version $(node --version) is too old (requires >= 18)"
        exit 1
    fi
fi

# Check if API dependencies are installed
echo ""
echo "Checking API dependencies..."
if [ -d "api/node_modules" ]; then
    print_status "OK" "API dependencies are installed"
else
    print_status "WARN" "API dependencies not found. Run: cd api && npm install --omit=dev --legacy-peer-deps"
fi

echo ""
print_status "OK" "Configuration validation completed successfully!"
echo ""
echo "Next steps:"
echo "1. Run ./bin/test-database.sh to verify database connectivity"
echo "2. Run ./bin/test-models.sh to verify model functionality"
echo "3. Start services with: pm2 start etc/certm3.pm2.config.js" 
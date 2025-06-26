#!/bin/bash
# check_setup+install_schema.sh: Setup and install CertM3 schema
# This script assumes you have already installed the basic dependencies

set -e

echo "=== CertM3 Setup and Schema Installation ==="
echo "This script sets up the database and builds CertM3 components."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    local status=$1
    local message=$2
    if [ "$status" = "OK" ]; then
        echo -e "${GREEN}✓${NC} $message"
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}⚠${NC} $message"
    elif [ "$status" = "INFO" ]; then
        echo -e "${BLUE}ℹ${NC} $message"
    else
        echo -e "${RED}✗${NC} $message"
        exit 1
    fi
}

echo "=== 1. Checking Dependencies ==="

# Check Node.js
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version | sed 's/v//')
    print_status "OK" "Node.js version: $NODE_VERSION"
else
    print_status "ERROR" "Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Check npm
if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm --version)
    print_status "OK" "npm version: $NPM_VERSION"
else
    print_status "ERROR" "npm not found"
    exit 1
fi

# Check PostgreSQL
if command -v psql >/dev/null 2>&1; then
    PG_VERSION=$(psql --version | grep -oE '[0-9]+\.[0-9]+' | head -1)
    print_status "OK" "PostgreSQL version: $PG_VERSION"
else
    print_status "ERROR" "PostgreSQL not found. Please install PostgreSQL 14+"
    exit 1
fi

# Check OpenSSL
if command -v openssl >/dev/null 2>&1; then
    OPENSSL_VERSION=$(openssl version | awk '{print $2}')
    print_status "OK" "OpenSSL version: $OPENSSL_VERSION"
else
    print_status "ERROR" "OpenSSL not found"
    exit 1
fi

# Check Go
if command -v go >/dev/null 2>&1; then
    GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
    print_status "OK" "Go version: $GO_VERSION"
else
    print_status "ERROR" "Go not found. Please install Go 1.19+"
    exit 1
fi

echo ""
echo "=== 2. Setting up Database ==="

# Create database user if it doesn't exist
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='certm3'" | grep -q 1; then
    print_status "INFO" "Creating database user certm3..."
    sudo -u postgres createuser --interactive --pwprompt certm3
else
    print_status "OK" "Database user certm3 already exists"
fi

# Create database if it doesn't exist
if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw certm3; then
    print_status "INFO" "Creating database certm3..."
    sudo -u postgres createdb -O certm3 certm3
else
    print_status "OK" "Database certm3 already exists"
fi

# Grant privileges
print_status "INFO" "Setting up database permissions..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE certm3 TO certm3;"
sudo -u postgres psql -c "GRANT ALL ON SCHEMA public TO certm3;"

echo ""
echo "=== 3. Installing Database Schema ==="

# Check if schema file exists
if [ ! -f "scripts/create_certm3_schema.sql" ]; then
    print_status "ERROR" "Schema file scripts/create_certm3_schema.sql not found"
    exit 1
fi

# Create a temporary schema file with correct user
print_status "INFO" "Preparing schema file..."
cp scripts/create_certm3_schema.sql /tmp/certm3_schema_temp.sql
sed -i 's/samcn2/certm3/g' /tmp/certm3_schema_temp.sql

# Install schema
print_status "INFO" "Installing database schema..."
sudo -u postgres psql -d certm3 -f /tmp/certm3_schema_temp.sql
rm /tmp/certm3_schema_temp.sql

print_status "OK" "Database schema installed successfully"

echo ""
echo "=== 4. Setting up Application User ==="

# Create system user for CertM3
if ! id "certm3" &>/dev/null; then
    print_status "INFO" "Creating system user certm3..."
    sudo adduser --system --group --home /opt/certm3 --shell /bin/bash certm3
    sudo usermod -aG sudo certm3
else
    print_status "OK" "System user certm3 already exists"
fi

# Create application directory
sudo mkdir -p /opt/certm3
sudo chown certm3:certm3 /opt/certm3

echo ""
echo "=== 5. Building Application Components ==="

# Build API
if [ -f "src/api/package.json" ]; then
    print_status "INFO" "Building API..."
    cd src/api
    npm install
    npm run build
    cd ../..
    print_status "OK" "API built successfully"
else
    print_status "WARN" "API package.json not found, skipping API build"
fi

# Build Middleware
if [ -f "src/mw/go.mod" ]; then
    print_status "INFO" "Building middleware..."
    cd src/mw
    go mod tidy
    go build -o bin/certm3-app cmd/certm3-app/main.go
    go build -o bin/certm3-signer cmd/certm3-signer/main.go
    cd ../..
    print_status "OK" "Middleware built successfully"
else
    print_status "WARN" "Middleware go.mod not found, skipping middleware build"
fi

# Build Web Frontend
if [ -f "src/web/package.json" ]; then
    print_status "INFO" "Building web frontend..."
    cd src/web
    npm install
    npm run build
    cd ../..
    print_status "OK" "Web frontend built successfully"
else
    print_status "WARN" "Web frontend package.json not found, skipping web build"
fi

echo ""
echo "=== 6. Setting up Configuration ==="

# Copy configuration files
if [ -f "src/mw/config.yaml.example" ]; then
    sudo cp src/mw/config.yaml.example /opt/certm3/config.yaml
    sudo chown certm3:certm3 /opt/certm3/config.yaml
    print_status "OK" "Middleware config created"
else
    print_status "WARN" "Middleware config example not found"
fi

# Set up nginx configuration
if [ -f "nginx/certm3.conf" ]; then
    sudo cp nginx/certm3.conf /etc/nginx/sites-available/certm3
    sudo ln -sf /etc/nginx/sites-available/certm3 /etc/nginx/sites-enabled/
    sudo nginx -t
    print_status "OK" "Nginx configuration installed"
else
    print_status "WARN" "Nginx configuration not found"
fi

echo ""
echo "=== 7. Setting up Services ==="

# Install PM2 globally if not present
if ! command -v pm2 >/dev/null 2>&1; then
    print_status "INFO" "Installing PM2..."
    sudo npm install -g pm2
fi

# Create systemd service files (if needed)
# This would require creating proper service files for the middleware and API

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Configure the middleware config file: /opt/certm3/config.yaml"
echo "2. Set up SSL certificates for your domain"
echo "3. Start the services:"
echo "   - Middleware: sudo systemctl start certm3-app"
echo "   - Signer: sudo systemctl start certm3-signer"
echo "   - API: pm2 start ecosystem.config.js"
echo "4. Restart nginx: sudo systemctl restart nginx"
echo ""
echo "For detailed instructions, see docs/quickstart.md"


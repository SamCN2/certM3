#!/bin/bash

# Exit on any error
set -e

# Configuration
APP_DIR="/home/samcn2/src/certM3"
STATIC_DIR="$APP_DIR/static"
LOG_DIR="/var/spool/certM3/logs"
EMAIL_DIR="/var/spool/certM3/test-emails"
DB_NAME="certm3"
DB_USER="certm3"
SYSTEM_USER="certm3"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status messages
print_status() {
    echo -e "${GREEN}[+]${NC} $1"
}

# Function to print warning messages
print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Function to print error messages
print_error() {
    echo -e "${RED}[!]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root"
    exit 1
fi

# Create system user
print_status "Creating system user..."
if ! id "$SYSTEM_USER" &>/dev/null; then
    useradd -m -s /bin/bash "$SYSTEM_USER"
    print_status "Created system user $SYSTEM_USER"
else
    print_status "System user $SYSTEM_USER already exists"
fi

# Create required directories if they don't exist
print_status "Creating required directories..."
mkdir -p "$LOG_DIR"
mkdir -p "$EMAIL_DIR"
chown -R "$SYSTEM_USER:$SYSTEM_USER" "$LOG_DIR"
chown -R "$SYSTEM_USER:$SYSTEM_USER" "$EMAIL_DIR"
chmod 755 "$LOG_DIR"
chmod 755 "$EMAIL_DIR"

# Set up database
print_status "Setting up database..."
# Create database and user if they don't exist
sudo -u postgres psql << EOF
DO
\$do\$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = '$DB_USER') THEN
      CREATE ROLE $DB_USER LOGIN;
   END IF;
END
\$do\$;

SELECT 'CREATE DATABASE $DB_NAME'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF

# Grant schema privileges
sudo -u postgres psql -d "$DB_NAME" << EOF
GRANT ALL ON SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
EOF

# Build API
print_status "Building API..."
cd "$APP_DIR/src/api"
npm ci
npm run build

# Build App
print_status "Building App..."
cd "$APP_DIR/src/app"
npm ci
npm run build
npm run build:static

# Verify static files
print_status "Verifying static files..."
cd "$APP_DIR/src/app"
npm run verify:static

# Security audit
print_status "Running security audit..."
cd "$APP_DIR/src/api"
npm audit
cd "$APP_DIR/src/app"
npm audit

# Update PM2 processes
print_status "Updating PM2 processes..."

# API Process
pm2 delete certm3-api || true
pm2 start "$APP_DIR/src/api/dist/server.js" \
    --name "certm3-api" \
    --log "$LOG_DIR/api.log" \
    --time \
    --max-memory-restart 1G \
    --env production \
    --user "$SYSTEM_USER"

# App Process
pm2 delete certm3-app || true
pm2 start "$APP_DIR/src/app/dist/server.js" \
    --name "certm3-app" \
    --log "$LOG_DIR/app.log" \
    --time \
    --max-memory-restart 1G \
    --env production \
    --user "$SYSTEM_USER"

# Save PM2 configuration
pm2 save

# Verify nginx configuration
print_status "Verifying nginx configuration..."
nginx -t

# Reload nginx if configuration is valid
if [ $? -eq 0 ]; then
    print_status "Reloading nginx..."
    systemctl reload nginx
else
    print_error "Nginx configuration test failed"
    exit 1
fi

# Final checks
print_status "Performing final checks..."

# Check if processes are running
if pm2 list | grep -q "certm3-api"; then
    print_status "API process is running"
else
    print_error "API process is not running"
    exit 1
fi

if pm2 list | grep -q "certm3-app"; then
    print_status "App process is running"
else
    print_error "App process is not running"
    exit 1
fi

# Check if nginx is running
if systemctl is-active --quiet nginx; then
    print_status "Nginx is running"
else
    print_error "Nginx is not running"
    exit 1
fi

# Verify endpoints
print_status "Verifying endpoints..."

# Check API endpoint
if curl -s -f "https://urp.ogt11.com/api/health" > /dev/null; then
    print_status "API endpoint is responding"
else
    print_error "API endpoint is not responding"
    exit 1
fi

# Check App endpoint
if curl -s -f "https://urp.ogt11.com/app/health" > /dev/null; then
    print_status "App endpoint is responding"
else
    print_error "App endpoint is not responding"
    exit 1
fi

print_status "Deployment completed successfully!" 
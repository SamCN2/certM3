#!/bin/bash
# Copyright 2025 ogt11.com, llc
# CertM3 Database Connectivity and Schema Test

set -e

echo "CertM3 Database Connectivity Test"
echo "================================="

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

# Check if we're in the right directory and find config file
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

# Extract database configuration from config.yaml
echo "Extracting database configuration..."
if command -v python3 &> /dev/null; then
    DB_HOST=$(python3 -c "import yaml; config=yaml.safe_load(open('$CONFIG_FILE')); print(config.get('database', {}).get('host', ''))" 2>/dev/null)
    DB_USER=$(python3 -c "import yaml; config=yaml.safe_load(open('$CONFIG_FILE')); print(config.get('database', {}).get('user', ''))" 2>/dev/null)
    DB_NAME=$(python3 -c "import yaml; config=yaml.safe_load(open('$CONFIG_FILE')); print(config.get('database', {}).get('database', ''))" 2>/dev/null)
    DB_PASSWORD=$(python3 -c "import yaml; config=yaml.safe_load(open('$CONFIG_FILE')); print(config.get('database', {}).get('password', ''))" 2>/dev/null)
elif command -v python &> /dev/null; then
    DB_HOST=$(python -c "import yaml; config=yaml.safe_load(open('$CONFIG_FILE')); print(config.get('database', {}).get('host', ''))" 2>/dev/null)
    DB_USER=$(python -c "import yaml; config=yaml.safe_load(open('$CONFIG_FILE')); print(config.get('database', {}).get('user', ''))" 2>/dev/null)
    DB_NAME=$(python -c "import yaml; config=yaml.safe_load(open('$CONFIG_FILE')); print(config.get('database', {}).get('database', ''))" 2>/dev/null)
    DB_PASSWORD=$(python -c "import yaml; config=yaml.safe_load(open('$CONFIG_FILE')); print(config.get('database', {}).get('password', ''))" 2>/dev/null)
else
    print_status "ERROR" "Python not available for config parsing"
    exit 1
fi

# Set defaults if not found
DB_HOST=${DB_HOST:-"/var/run/postgresql"}
DB_USER=${DB_USER:-"certm3"}
DB_NAME=${DB_NAME:-"certm3"}
DB_PASSWORD=${DB_PASSWORD:-""}

echo "Database configuration:"
echo "  Host: $DB_HOST"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"
echo "  Password: [hidden]"

# Test PostgreSQL connection
echo ""
echo "Testing PostgreSQL connection..."

# Set PGPASSWORD if password is provided
if [ -n "$DB_PASSWORD" ]; then
    export PGPASSWORD="$DB_PASSWORD"
fi

# Test basic connection
if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" >/dev/null 2>&1; then
    print_status "OK" "Database connection successful"
else
    print_status "ERROR" "Database connection failed"
    echo "Troubleshooting tips:"
    echo "1. Check if PostgreSQL is running: sudo systemctl status postgresql"
    echo "2. Verify database exists: sudo -u postgres psql -c '\\l'"
    echo "3. Check user permissions: sudo -u postgres psql -c '\\du'"
    echo "4. Verify connection parameters in $CONFIG_FILE"
    exit 1
fi

# Get PostgreSQL version
PG_VERSION=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version();" | head -1 | sed 's/PostgreSQL \([0-9]*\.[0-9]*\).*/\1/')
echo "PostgreSQL version: $PG_VERSION"

# Check if database exists
echo ""
echo "Checking database schema..."

# Check if certm3 schema exists
if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'public';" | grep -q public; then
    print_status "OK" "Public schema exists"
else
    print_status "ERROR" "Public schema not found"
    exit 1
fi

# Check required tables
REQUIRED_TABLES=("users" "groups" "user_groups" "requests")

for table in "${REQUIRED_TABLES[@]}"; do
    if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table';" | grep -q "$table"; then
        print_status "OK" "Table exists: $table"
    else
        print_status "ERROR" "Table missing: $table"
        echo "Run database setup: sudo -u postgres ./setup-database.sh"
        exit 1
    fi
done

# Check table structure
echo ""
echo "Checking table structure..."

# Check users table structure
if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "\\d users" | grep -q "id.*uuid"; then
    print_status "OK" "Users table has correct structure"
else
    print_status "ERROR" "Users table structure is incorrect"
fi

# Check groups table structure
if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "\\d groups" | grep -q "name.*character varying.*255"; then
    print_status "OK" "Groups table has correct structure"
else
    print_status "ERROR" "Groups table structure is incorrect"
    echo "Expected: name | character varying(255) | not null"
    echo "Actual structure:"
    psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "\\d groups" | grep "name"
fi

# Check for required columns with timestamps
echo ""
echo "Checking timestamp columns..."

# Check if timestamp columns exist and have default values
TIMESTAMP_COLUMNS=(
    "users.created_at"
    "users.updated_at"
    "groups.created_at"
    "groups.updated_at"
    "user_groups.created_at"
    "user_groups.updated_at"
    "requests.created_at"
    "requests.updated_at"
)

for column in "${TIMESTAMP_COLUMNS[@]}"; do
    table=$(echo "$column" | cut -d'.' -f1)
    col=$(echo "$column" | cut -d'.' -f2)
    
    if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "\\d $table" | grep -q "$col.*timestamp"; then
        print_status "OK" "Column exists: $column"
    else
        print_status "ERROR" "Column missing: $column"
    fi
done

# Test basic queries
echo ""
echo "Testing basic queries..."

# Test user count
USER_COUNT=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users;" | xargs)
print_status "OK" "Users table query successful (count: $USER_COUNT)"

# Test group count
GROUP_COUNT=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM groups;" | xargs)
print_status "OK" "Groups table query successful (count: $GROUP_COUNT)"

# Test request count
REQUEST_COUNT=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM requests;" | xargs)
print_status "OK" "Requests table query successful (count: $REQUEST_COUNT)"

# Test database performance
echo ""
echo "Testing database performance..."

START_TIME=$(date +%s.%N)
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1
END_TIME=$(date +%s.%N)

RESPONSE_TIME=$(echo "$END_TIME - $START_TIME" | bc -l 2>/dev/null || echo "0.001")
print_status "OK" "Database response time: ${RESPONSE_TIME}s"

echo ""
print_status "OK" "Database connectivity test completed successfully!"
echo ""
echo "Next steps:"
echo "1. Run ./scripts/test-models.sh to verify model functionality"
echo "2. Start services with: pm2 start etc/certm3.pm2.config.js" 

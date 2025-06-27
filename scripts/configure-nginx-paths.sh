#!/bin/bash

# configure-nginx-paths.sh: Configure hardcoded paths in nginx configuration
# This script updates the nginx configuration with the correct paths for the current system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
DEFAULT_PROJECT_ROOT="/home/samcn2/src/certM3"
DEFAULT_SSL_CERT_DIR="/etc/certs"
DEFAULT_CA_CERT_PATH="/home/samcn2/src/certM3/CA/certs/ca-cert.pem"

echo -e "${BLUE}=== CertM3 Nginx Path Configuration ===${NC}"
echo "This script configures hardcoded paths in the nginx configuration."
echo ""

# Function to get user input with default
get_input() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"
    
    echo -e "${YELLOW}$prompt${NC}"
    echo -e "Default: ${GREEN}$default${NC}"
    read -p "Enter value (or press Enter for default): " input
    
    if [ -z "$input" ]; then
        eval "$var_name=\"$default\""
    else
        eval "$var_name=\"$input\""
    fi
}

# Function to backup file
backup_file() {
    local file="$1"
    local backup="${file}.backup.$(date +%Y%m%d_%H%M%S)"
    
    if [ -f "$file" ]; then
        cp "$file" "$backup"
        echo -e "${GREEN}✓${NC} Backup created: $backup"
    fi
}

# Function to validate path
validate_path() {
    local path="$1"
    local description="$2"
    
    if [ ! -e "$path" ]; then
        echo -e "${YELLOW}⚠${NC} Warning: $description path does not exist: $path"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${RED}Configuration cancelled.${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✓${NC} $description path exists: $path"
    fi
}

# Get current project root
CURRENT_DIR=$(pwd)
echo -e "${BLUE}Current directory:${NC} $CURRENT_DIR"

# Get user input for paths
get_input "Enter the project root directory:" "$CURRENT_DIR" "PROJECT_ROOT"
get_input "Enter the SSL certificate directory:" "$DEFAULT_SSL_CERT_DIR" "SSL_CERT_DIR"
get_input "Enter the CA certificate path:" "$DEFAULT_CA_CERT_PATH" "CA_CERT_PATH"

# Validate paths
echo ""
echo -e "${BLUE}Validating paths...${NC}"
validate_path "$PROJECT_ROOT" "Project root"
validate_path "$SSL_CERT_DIR" "SSL certificate directory"
validate_path "$CA_CERT_PATH" "CA certificate"

# Check if nginx config exists
NGINX_CONFIG="nginx/certm3.conf"
if [ ! -f "$NGINX_CONFIG" ]; then
    echo -e "${RED}✗${NC} Nginx configuration file not found: $NGINX_CONFIG"
    exit 1
fi

echo ""
echo -e "${BLUE}Configuration Summary:${NC}"
echo "Project Root: $PROJECT_ROOT"
echo "SSL Cert Dir: $SSL_CERT_DIR"
echo "CA Cert Path: $CA_CERT_PATH"
echo "Nginx Config: $NGINX_CONFIG"

echo ""
read -p "Proceed with configuration? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Configuration cancelled.${NC}"
    exit 0
fi

# Backup original config
echo ""
echo -e "${BLUE}Creating backup...${NC}"
backup_file "$NGINX_CONFIG"

# Update nginx configuration
echo ""
echo -e "${BLUE}Updating nginx configuration...${NC}"

# Create temporary file
TEMP_CONFIG=$(mktemp)

# Replace paths in the configuration
sed -e "s|/home/samcn2/src/certM3|$PROJECT_ROOT|g" \
    -e "s|/etc/certs/urp.ogt11.com|$SSL_CERT_DIR/urp.ogt11.com|g" \
    -e "s|\"/home/samcn2/src/certM3/CA/certs/ca-cert.pem\"|\"$CA_CERT_PATH\"|g" \
    "$NGINX_CONFIG" > "$TEMP_CONFIG"

# Verify the changes
echo -e "${GREEN}✓${NC} Path replacements completed"

# Show a sample of the changes
echo ""
echo -e "${BLUE}Sample of changes:${NC}"
echo "Static files path: $PROJECT_ROOT/static/"
echo "SSL certificate: $SSL_CERT_DIR/urp.ogt11.com/fullchain.pem"
echo "SSL private key: $SSL_CERT_DIR/urp.ogt11.com/privkey.pem"
echo "CA certificate: $CA_CERT_PATH"

# Test nginx configuration syntax
echo ""
echo -e "${BLUE}Testing nginx configuration syntax...${NC}"
if nginx -t -c "$TEMP_CONFIG" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Nginx configuration syntax is valid"
else
    echo -e "${RED}✗${NC} Nginx configuration syntax error"
    echo "Please check the configuration manually"
    rm "$TEMP_CONFIG"
    exit 1
fi

# Replace original file
mv "$TEMP_CONFIG" "$NGINX_CONFIG"
echo -e "${GREEN}✓${NC} Nginx configuration updated successfully"

echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Review the updated configuration: $NGINX_CONFIG"
echo "2. Ensure SSL certificates are in place: $SSL_CERT_DIR/urp.ogt11.com/"
echo "3. Ensure CA certificate exists: $CA_CERT_PATH"
echo "4. Test nginx configuration: sudo nginx -t"
echo "5. Reload nginx: sudo systemctl reload nginx"

echo ""
echo -e "${GREEN}✓${NC} Nginx path configuration completed successfully!" 
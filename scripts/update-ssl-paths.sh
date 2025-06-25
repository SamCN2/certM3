#!/bin/bash
# update-ssl-paths.sh: Update SSL certificate paths in nginx configuration
# Usage: ./scripts/update-ssl-paths.sh <domain> <ssl-cert-path> <ssl-key-path>
# Example: ./scripts/update-ssl-paths.sh certm3.example.com /etc/ssl/certs/certm3.example.com.crt /etc/ssl/private/certm3.example.com.key

set -e

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

# Function to backup file
backup_file() {
    local file=$1
    if [ -f "$file" ]; then
        cp "$file" "${file}.bak.$(date +%Y%m%d_%H%M%S)"
        print_status "OK" "Backed up $file"
    fi
}

# Check arguments
if [ $# -ne 3 ]; then
    echo "Usage: $0 <domain> <ssl-cert-path> <ssl-key-path>"
    echo "Example: $0 certm3.example.com /etc/ssl/certs/certm3.example.com.crt /etc/ssl/private/certm3.example.com.key"
    exit 1
fi

DOMAIN=$1
SSL_CERT_PATH=$2
SSL_KEY_PATH=$3
NGINX_CONFIG="nginx/certm3.conf"

# Validate paths
if [ ! -f "$SSL_CERT_PATH" ]; then
    print_status "FAIL" "SSL certificate not found: $SSL_CERT_PATH"
    exit 1
fi

if [ ! -f "$SSL_KEY_PATH" ]; then
    print_status "FAIL" "SSL key not found: $SSL_KEY_PATH"
    exit 1
fi

echo "=== CertM3 SSL Path Configuration ==="
echo "Domain: $DOMAIN"
echo "SSL Certificate: $SSL_CERT_PATH"
echo "SSL Key: $SSL_KEY_PATH"
echo ""

# Confirm before proceeding
read -p "Do you want to proceed with these changes? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Configuration cancelled."
    exit 0
fi

echo ""
echo "=== Starting SSL Path Configuration ==="

# Backup nginx config
backup_file "$NGINX_CONFIG"

# Update server_name
sed -i "s/server_name .*;/server_name $DOMAIN;/" "$NGINX_CONFIG"

# Update SSL certificate paths
sed -i "s|ssl_certificate .*;|ssl_certificate $SSL_CERT_PATH;|" "$NGINX_CONFIG"
sed -i "s|ssl_certificate_key .*;|ssl_certificate_key $SSL_KEY_PATH;|" "$NGINX_CONFIG"

print_status "OK" "Updated nginx configuration with new SSL paths"

echo ""
echo "=== Configuration Complete ==="
print_status "OK" "SSL path configuration completed successfully"

echo ""
echo "=== Next Steps ==="
echo "1. Test nginx configuration: nginx -t"
echo "2. Reload nginx: systemctl reload nginx"
echo "3. Verify SSL certificate: openssl s_client -connect $DOMAIN:443 -servername $DOMAIN"

echo ""
echo "=== Verification ==="
echo "You can verify the changes by running:"
echo "grep -E 'server_name|ssl_certificate' $NGINX_CONFIG" 
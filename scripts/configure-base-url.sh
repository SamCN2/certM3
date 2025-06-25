#!/bin/bash
# configure-base-url.sh: Configure CertM3 base URL across all components
# Usage: ./scripts/configure-base-url.sh <new-base-url>
# Example: ./scripts/configure-base-url.sh https://certm3.example.com

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

# Function to validate URL format
validate_url() {
    local url=$1
    if [[ $url =~ ^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        return 0
    else
        return 1
    fi
}

# Function to extract domain from URL
extract_domain() {
    local url=$1
    echo "$url" | sed -E 's|^https?://([^/]+).*|\1|'
}

# Function to backup file
backup_file() {
    local file=$1
    if [ -f "$file" ]; then
        cp "$file" "${file}.bak.$(date +%Y%m%d_%H%M%S)"
        print_status "OK" "Backed up $file"
    fi
}

# Function to replace URLs in file
replace_urls_in_file() {
    local file=$1
    local old_url=$2
    local new_url=$3
    local old_domain=$4
    local new_domain=$5
    
    if [ ! -f "$file" ]; then
        print_status "WARN" "File not found: $file"
        return
    fi
    
    # Create backup
    backup_file "$file"
    
    # Replace URLs
    sed -i "s|$old_url|$new_url|g" "$file"
    sed -i "s|$old_domain|$new_domain|g" "$file"
    
    print_status "OK" "Updated $file"
}

# Check arguments
if [ $# -ne 1 ]; then
    echo "Usage: $0 <new-base-url>"
    echo "Example: $0 https://certm3.example.com"
    exit 1
fi

NEW_BASE_URL=$1
OLD_BASE_URL="https://urp.ogt11.com"
OLD_DOMAIN="urp.ogt11.com"
NEW_DOMAIN=$(extract_domain "$NEW_BASE_URL")

# Validate new URL
if ! validate_url "$NEW_BASE_URL"; then
    print_status "FAIL" "Invalid URL format: $NEW_BASE_URL"
    echo "URL must be in format: https://domain.com or http://domain.com"
    exit 1
fi

echo "=== CertM3 Base URL Configuration ==="
echo "Old base URL: $OLD_BASE_URL"
echo "New base URL: $NEW_BASE_URL"
echo "Old domain: $OLD_DOMAIN"
echo "New domain: $NEW_DOMAIN"
echo ""

# Confirm before proceeding
read -p "Do you want to proceed with these changes? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Configuration cancelled."
    exit 0
fi

echo ""
echo "=== Starting Configuration ==="

# 1. Update middleware configuration
print_status "INFO" "Updating middleware configuration..."
replace_urls_in_file "src/mw/config.yaml" "$OLD_BASE_URL" "$NEW_BASE_URL" "$OLD_DOMAIN" "$NEW_DOMAIN"
replace_urls_in_file "src/mw/config.yaml.example" "$OLD_BASE_URL" "$NEW_BASE_URL" "$OLD_DOMAIN" "$NEW_DOMAIN"

# 2. Update certificate configuration
print_status "INFO" "Updating certificate configuration..."
replace_urls_in_file "src/mw/certM3.config" "$OLD_BASE_URL" "$NEW_BASE_URL" "$OLD_DOMAIN" "$NEW_DOMAIN"

# 3. Update PM2 configuration
print_status "INFO" "Updating PM2 configuration..."
replace_urls_in_file "ecosystem.config.js" "$OLD_BASE_URL" "$NEW_BASE_URL" "$OLD_DOMAIN" "$NEW_DOMAIN"

# 4. Update nginx configuration
print_status "INFO" "Updating nginx configuration..."
replace_urls_in_file "nginx/certm3.conf" "$OLD_BASE_URL" "$NEW_BASE_URL" "$OLD_DOMAIN" "$NEW_DOMAIN"

# 5. Update API source code
print_status "INFO" "Updating API source code..."
replace_urls_in_file "src/api/src/controllers/request.controller.ts" "$OLD_BASE_URL" "$NEW_BASE_URL" "$OLD_DOMAIN" "$NEW_DOMAIN"

# 6. Update test files
print_status "INFO" "Updating test files..."
replace_urls_in_file "tests/test-groups.sh" "$OLD_BASE_URL" "$NEW_BASE_URL" "$OLD_DOMAIN" "$NEW_DOMAIN"
replace_urls_in_file "tests/test-groups.ts" "$OLD_BASE_URL" "$NEW_BASE_URL" "$OLD_DOMAIN" "$NEW_DOMAIN"
replace_urls_in_file "tests/test-integration.ts" "$OLD_BASE_URL" "$NEW_BASE_URL" "$OLD_DOMAIN" "$NEW_DOMAIN"
replace_urls_in_file "tests/test-views.ts" "$OLD_BASE_URL" "$NEW_BASE_URL" "$OLD_DOMAIN" "$NEW_DOMAIN"
replace_urls_in_file "tests/test-routes.sh" "$OLD_BASE_URL" "$NEW_BASE_URL" "$OLD_DOMAIN" "$NEW_DOMAIN"
replace_urls_in_file "tests/test-routes.ts" "$OLD_BASE_URL" "$NEW_BASE_URL" "$OLD_DOMAIN" "$NEW_DOMAIN"
replace_urls_in_file "tests/create-test-user.sh" "$OLD_BASE_URL" "$NEW_BASE_URL" "$OLD_DOMAIN" "$NEW_DOMAIN"
replace_urls_in_file "tests/test-validate.sh" "$OLD_BASE_URL" "$NEW_BASE_URL" "$OLD_DOMAIN" "$NEW_DOMAIN"
replace_urls_in_file "tests/mkrequest.sh" "$OLD_BASE_URL" "$NEW_BASE_URL" "$OLD_DOMAIN" "$NEW_DOMAIN"

# 7. Update middleware scripts
print_status "INFO" "Updating middleware scripts..."
replace_urls_in_file "src/mw/scripts/fix_user_groups.sh" "$OLD_BASE_URL" "$NEW_BASE_URL" "$OLD_DOMAIN" "$NEW_DOMAIN"
replace_urls_in_file "src/mw/test/test.env" "$OLD_BASE_URL" "$NEW_BASE_URL" "$OLD_DOMAIN" "$NEW_DOMAIN"

# 8. Update deployment scripts
print_status "INFO" "Updating deployment scripts..."
replace_urls_in_file "scripts/deploy.sh" "$OLD_BASE_URL" "$NEW_BASE_URL" "$OLD_DOMAIN" "$NEW_DOMAIN"

# 9. Update OpenAPI specifications
print_status "INFO" "Updating OpenAPI specifications..."
replace_urls_in_file "docs/openapi.yaml" "$OLD_BASE_URL" "$NEW_BASE_URL" "$OLD_DOMAIN" "$NEW_DOMAIN"
replace_urls_in_file "docs/newopenapi.yaml" "$OLD_BASE_URL" "$NEW_BASE_URL" "$OLD_DOMAIN" "$NEW_DOMAIN"
replace_urls_in_file "src/mw/docs/backend-openapi.yaml" "$OLD_BASE_URL" "$NEW_BASE_URL" "$OLD_DOMAIN" "$NEW_DOMAIN"

# 10. Update deprecated app code (for reference)
print_status "INFO" "Updating deprecated app code..."
replace_urls_in_file "src/app.deprecated/src/server.ts" "$OLD_BASE_URL" "$NEW_BASE_URL" "$OLD_DOMAIN" "$NEW_DOMAIN"
replace_urls_in_file "src/app.deprecated/src/js/request.js" "$OLD_BASE_URL" "$NEW_BASE_URL" "$OLD_DOMAIN" "$NEW_DOMAIN"
replace_urls_in_file "src/app.deprecated/dist/server.js" "$OLD_BASE_URL" "$NEW_BASE_URL" "$OLD_DOMAIN" "$NEW_DOMAIN"

# 11. Update API test files
print_status "INFO" "Updating API test files..."
replace_urls_in_file "src/api/src/__tests__/test-helper.ts" "$OLD_BASE_URL" "$NEW_BASE_URL" "$OLD_DOMAIN" "$NEW_DOMAIN"
replace_urls_in_file "src/api/src/__tests__/group-membership.test.ts.disabled" "$OLD_BASE_URL" "$NEW_BASE_URL" "$OLD_DOMAIN" "$NEW_DOMAIN"

echo ""
echo "=== Configuration Complete ==="
print_status "OK" "Base URL configuration completed successfully"

echo ""
echo "=== Next Steps ==="
echo "1. Update your DNS to point $NEW_DOMAIN to your server"
echo "2. Generate SSL certificates for $NEW_DOMAIN"
echo "3. Update the SSL certificate paths in nginx/certm3.conf"
echo "4. Test the configuration with: ./scripts/verify-build.sh"
echo "5. Deploy with: ./scripts/deploy.sh"

echo ""
echo "=== Backup Files ==="
echo "Backup files have been created with .bak.YYYYMMDD_HHMMSS extension"
echo "To restore: find . -name '*.bak.*' -exec cp {} {}.restored \;"

echo ""
echo "=== Verification ==="
echo "You can verify the changes by running:"
echo "grep -r '$NEW_DOMAIN' . --exclude-dir=.git --exclude='*.bak.*'" 
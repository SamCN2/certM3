#!/bin/bash
# configure-fqdn.sh: Interactive FQDN configuration for CertM3
# This script helps users configure their domain throughout the system

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

# Function to validate FQDN format
validate_fqdn() {
    local fqdn=$1
    
    # Basic FQDN validation regex
    if [[ $fqdn =~ ^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$ ]]; then
        return 0
    else
        return 1
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

# Function to replace FQDN in a file
replace_fqdn_in_file() {
    local file=$1
    local old_fqdn=$2
    local new_fqdn=$3
    
    if [ ! -f "$file" ]; then
        return
    fi
    
    # Replace FQDN with new domain
    sed -i "s/$old_fqdn/$new_fqdn/g" "$file"
    print_status "OK" "Updated FQDN in $file"
}

# Function to find all files containing FQDN
find_fqdn_files() {
    local fqdn=$1
    grep -r "$fqdn" . --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude=*.bak* --exclude=*.log --exclude=*.tmp 2>/dev/null | cut -d: -f1 | sort -u
}

echo "=== CertM3 FQDN Configuration ==="
echo "This script helps you configure your domain throughout the CertM3 system"
echo ""

# Current FQDN
CURRENT_FQDN="urp.ogt11.com"

echo -e "${BLUE}ℹ${NC} Current FQDN: $CURRENT_FQDN"
echo ""

# Get new FQDN from user
while true; do
    read -p "Enter your domain (e.g., certm3.example.com): " NEW_FQDN
    
    if [ -z "$NEW_FQDN" ]; then
        echo -e "${RED}✗${NC} Domain cannot be empty"
        continue
    fi
    
    if ! validate_fqdn "$NEW_FQDN"; then
        echo -e "${RED}✗${NC} Invalid domain format. Please use a valid FQDN (e.g., certm3.example.com)"
        continue
    fi
    
    if [ "$NEW_FQDN" = "$CURRENT_FQDN" ]; then
        echo -e "${YELLOW}⚠${NC} New domain is the same as current domain. No changes needed."
        exit 0
    fi
    
    break
done

echo ""
echo "=== Analysis ==="

# Find all files containing the current FQDN
echo "Finding files containing FQDN..."
FQDN_FILES=$(find_fqdn_files "$CURRENT_FQDN")

if [ -z "$FQDN_FILES" ]; then
    print_status "WARN" "No files found containing FQDN: $CURRENT_FQDN"
    exit 0
fi

echo "Found $(echo "$FQDN_FILES" | wc -l) files containing FQDN:"
echo "$FQDN_FILES" | head -10
if [ $(echo "$FQDN_FILES" | wc -l) -gt 10 ]; then
    echo "... and $(($(echo "$FQDN_FILES" | wc -l) - 10)) more files"
fi

echo ""
echo "=== File Categories ==="

# Categorize files
CONFIG_FILES=$(echo "$FQDN_FILES" | grep -E "(nginx|certM3\.config|config\.yaml)" || true)
DOC_FILES=$(echo "$FQDN_FILES" | grep -E "(docs/|README)" || true)
TEST_FILES=$(echo "$FQDN_FILES" | grep -E "(test/|__tests__)" || true)
CODE_FILES=$(echo "$FQDN_FILES" | grep -E "(src/|\.ts$|\.js$|\.go$)" || true)
SCRIPT_FILES=$(echo "$FQDN_FILES" | grep -E "(scripts/|\.sh$)" || true)

echo "Configuration files: $(echo "$CONFIG_FILES" | wc -l)"
echo "Documentation files: $(echo "$DOC_FILES" | wc -l)"
echo "Test files: $(echo "$TEST_FILES" | wc -l)"
echo "Code files: $(echo "$CODE_FILES" | wc -l)"
echo "Script files: $(echo "$SCRIPT_FILES" | wc -l)"

echo ""
echo "=== Configuration Summary ==="
echo "Current FQDN: $CURRENT_FQDN"
echo "New FQDN: $NEW_FQDN"
echo "Files to update: $(echo "$FQDN_FILES" | wc -l)"
echo ""

# Ask for confirmation
read -p "Proceed with FQDN configuration? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Configuration cancelled."
    exit 0
fi

echo ""
echo "=== Processing Files ==="

# Process each file
for file in $FQDN_FILES; do
    if [ -f "$file" ]; then
        backup_file "$file"
        replace_fqdn_in_file "$file" "$CURRENT_FQDN" "$NEW_FQDN"
    fi
done

echo ""
echo "=== SSL Certificate Setup ==="

# Check if SSL certificates exist for the new domain
SSL_CERT_PATH="/etc/certs/$NEW_FQDN/fullchain.pem"
SSL_KEY_PATH="/etc/certs/$NEW_FQDN/privkey.pem"

if [ -f "$SSL_CERT_PATH" ] && [ -f "$SSL_KEY_PATH" ]; then
    print_status "OK" "SSL certificates found for $NEW_FQDN"
else
    print_status "WARN" "SSL certificates not found for $NEW_FQDN"
    echo ""
    echo "You'll need to set up SSL certificates for $NEW_FQDN:"
    echo "1. Create certificate directory:"
    echo "   sudo mkdir -p /etc/certs/$NEW_FQDN"
    echo ""
    echo "2. Generate self-signed certificate (for testing):"
    echo "   sudo openssl req -x509 -newkey rsa:4096 -keyout $SSL_KEY_PATH -out $SSL_CERT_PATH -days 365 -nodes -subj \"/CN=$NEW_FQDN\""
    echo ""
    echo "3. Set proper permissions:"
    echo "   sudo chmod 644 $SSL_CERT_PATH"
    echo "   sudo chmod 600 $SSL_KEY_PATH"
    echo ""
    echo "4. For production, obtain a proper SSL certificate from a CA"
fi

echo ""
echo "=== DNS Configuration ==="

# Check if domain resolves
if nslookup "$NEW_FQDN" >/dev/null 2>&1; then
    print_status "OK" "Domain $NEW_FQDN resolves"
else
    print_status "WARN" "Domain $NEW_FQDN does not resolve"
    echo ""
    echo "You'll need to configure DNS for $NEW_FQDN:"
    echo "1. Add an A record pointing to your server's IP address"
    echo "2. For development, you can add to /etc/hosts:"
    echo "   127.0.0.1 $NEW_FQDN"
    echo "   ::1 $NEW_FQDN"
fi

echo ""
echo "=== Configuration Complete ==="
print_status "OK" "FQDN configuration completed successfully"

echo ""
echo "=== Next Steps ==="
echo "1. Update SSL certificates (if needed)"
echo "2. Configure DNS records"
echo "3. Test the configuration:"
echo "   curl -k https://$NEW_FQDN/api/health"
echo "   curl -k https://$NEW_FQDN/app/health"
echo "4. Restart services if needed:"
echo "   sudo systemctl reload nginx"
echo "   pm2 restart all"

echo ""
echo "=== Verification ==="
echo "You can verify the changes by running:"
echo "  grep -r '$NEW_FQDN' . --exclude-dir=.git"
echo ""
echo "To revert changes, restore from backup files:"
echo "  find . -name '*.bak.*' -exec ls -la {} \\;" 
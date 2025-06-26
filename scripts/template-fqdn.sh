#!/bin/bash
# template-fqdn.sh: Template FQDN configuration throughout the codebase
# This script replaces hardcoded FQDN with a configurable placeholder

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

# Function to replace FQDN in a file
replace_fqdn() {
    local file=$1
    local old_fqdn=$2
    local new_fqdn=$3
    local mode=$4  # "template" or "restore"
    
    if [ ! -f "$file" ]; then
        return
    fi
    
    if [ "$mode" = "template" ]; then
        # Replace FQDN with placeholder
        sed -i "s/$old_fqdn/FQDN.HERE/g" "$file"
        print_status "OK" "Templated FQDN in $file"
    elif [ "$mode" = "restore" ]; then
        # Replace placeholder with actual FQDN
        sed -i "s/FQDN\.HERE/$new_fqdn/g" "$file"
        print_status "OK" "Restored FQDN in $file"
    fi
}

# Function to find all files containing FQDN
find_fqdn_files() {
    local fqdn=$1
    grep -r "$fqdn" . --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude=*.bak* --exclude=*.log --exclude=*.tmp 2>/dev/null | cut -d: -f1 | sort -u
}

echo "=== CertM3 FQDN Templating Script ==="
echo "This script helps manage FQDN configuration throughout the codebase"
echo ""

# Check if we're templating or restoring
if [ "$1" = "template" ]; then
    MODE="template"
    echo "Mode: Templating FQDN (replacing with FQDN.HERE placeholder)"
elif [ "$1" = "restore" ]; then
    if [ -z "$2" ]; then
        echo "Usage: $0 restore <new-fqdn>"
        echo "Example: $0 restore certm3.example.com"
        exit 1
    fi
    MODE="restore"
    NEW_FQDN=$2
    echo "Mode: Restoring FQDN (replacing FQDN.HERE with $NEW_FQDN)"
else
    echo "Usage: $0 <template|restore> [new-fqdn]"
    echo ""
    echo "Commands:"
    echo "  template  - Replace all FQDN occurrences with FQDN.HERE placeholder"
    echo "  restore   - Replace FQDN.HERE placeholder with actual FQDN"
    echo ""
    echo "Examples:"
    echo "  $0 template"
    echo "  $0 restore certm3.example.com"
    exit 1
fi

# Current FQDN
CURRENT_FQDN="urp.ogt11.com"

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
echo "=== Confirmation ==="

if [ "$MODE" = "template" ]; then
    echo "This will replace all occurrences of '$CURRENT_FQDN' with 'FQDN.HERE'"
    echo "Files will be backed up before modification"
    read -p "Proceed with templating? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Templating cancelled."
        exit 0
    fi
else
    echo "This will replace all occurrences of 'FQDN.HERE' with '$NEW_FQDN'"
    echo "Files will be backed up before modification"
    read -p "Proceed with restoration? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Restoration cancelled."
        exit 0
    fi
fi

echo ""
echo "=== Processing Files ==="

# Process each file
for file in $FQDN_FILES; do
    if [ -f "$file" ]; then
        backup_file "$file"
        if [ "$MODE" = "template" ]; then
            replace_fqdn "$file" "$CURRENT_FQDN" "" "template"
        else
            replace_fqdn "$file" "" "$NEW_FQDN" "restore"
        fi
    fi
done

echo ""
echo "=== Summary ==="

if [ "$MODE" = "template" ]; then
    print_status "OK" "FQDN templating completed successfully"
    echo ""
    echo "All occurrences of '$CURRENT_FQDN' have been replaced with 'FQDN.HERE'"
    echo ""
    echo "To restore with a new FQDN, run:"
    echo "  $0 restore <your-domain.com>"
    echo ""
    echo "Example:"
    echo "  $0 restore certm3.example.com"
else
    print_status "OK" "FQDN restoration completed successfully"
    echo ""
    echo "All occurrences of 'FQDN.HERE' have been replaced with '$NEW_FQDN'"
    echo ""
    echo "Next steps:"
    echo "1. Update SSL certificates for $NEW_FQDN"
    echo "2. Update DNS records"
    echo "3. Test the configuration"
fi

echo ""
echo "=== Verification ==="
echo "You can verify the changes by running:"
if [ "$MODE" = "template" ]; then
    echo "  grep -r 'FQDN.HERE' . --exclude-dir=.git"
else
    echo "  grep -r '$NEW_FQDN' . --exclude-dir=.git"
fi 
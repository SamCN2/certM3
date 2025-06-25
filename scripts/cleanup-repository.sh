#!/bin/bash
# cleanup-repository.sh: Remove unnecessary files from git tracking
# This script removes files from git tracking but keeps them locally

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

# Function to remove files from git tracking
remove_from_git() {
    local pattern=$1
    local description=$2
    
    echo ""
    print_status "INFO" "Removing $description from git tracking..."
    
    # Find files matching pattern
    local files=$(git ls-files | grep -E "$pattern" || true)
    
    if [ -z "$files" ]; then
        print_status "WARN" "No files found matching pattern: $pattern"
        return
    fi
    
    # Count files
    local count=$(echo "$files" | wc -l)
    print_status "INFO" "Found $count files to remove from tracking"
    
    # Remove from git tracking (but keep locally)
    echo "$files" | xargs -r git rm --cached
    
    print_status "OK" "Removed $count $description from git tracking"
}

echo "=== CertM3 Repository Cleanup ==="
echo "This script will remove unnecessary files from git tracking"
echo "Files will be preserved locally but no longer tracked by git"
echo ""

# Confirm before proceeding
read -p "Do you want to proceed with repository cleanup? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo ""
echo "=== Starting Repository Cleanup ==="

# 1. Remove build artifacts and compiled files
remove_from_git "src/app\.deprecated/dist/" "compiled JavaScript files"
remove_from_git "src/app\.deprecated/semantic/dist/" "Semantic UI build files"
remove_from_git "\.min\.(js|css)$" "minified files"
remove_from_git "\.map$" "source map files"

# 2. Remove temporary and backup files
remove_from_git "docs\.aux/" "auxiliary documentation files"
remove_from_git "\.bak$" "backup files"
remove_from_git "\.output\.txt$" "test output files"

# 3. Remove lock files (can be regenerated)
remove_from_git "package-lock\.json$" "package lock files"
remove_from_git "yarn\.lock$" "yarn lock files"

# 4. Remove test artifacts (outside of src/mw/test/)
remove_from_git "src/api/test.*\.output\.txt$" "API test output files"

# 5. Remove environment files
remove_from_git "src/mw/test/test\.env$" "test environment file"

echo ""
echo "=== Cleanup Complete ==="
print_status "OK" "Repository cleanup completed successfully"

echo ""
echo "=== Summary ==="
echo "Files have been removed from git tracking but preserved locally."
echo "To commit these changes:"
echo "  git add ."
echo "  git commit -m 'Remove unnecessary files from git tracking'"

echo ""
echo "=== Verification ==="
echo "You can verify the changes by running:"
echo "  git status"
echo "  git ls-files | wc -l" 
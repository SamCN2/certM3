#!/bin/bash

# Documentation and API Cleanup Script for certM3
# This script helps identify and clean up potentially deprecated or duplicate files

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="docs/archive/$(date +%Y%m%d_%H%M%S)"
LOG_FILE="docs/cleanup-log-$(date +%Y%m%d_%H%M%S).txt"

echo -e "${BLUE}CertM3 Documentation Cleanup Script${NC}"
echo "=========================================="
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Function to log actions
log_action() {
    echo "$(date): $1" | tee -a "$LOG_FILE"
}

# Function to backup file before removal
backup_file() {
    local file="$1"
    local reason="$2"
    
    if [[ -f "$file" ]]; then
        local backup_path="$BACKUP_DIR/$(basename "$file")"
        cp "$file" "$backup_path"
        log_action "BACKUP: $file -> $backup_path (Reason: $reason)"
    fi
}

# Function to remove file with confirmation
remove_file() {
    local file="$1"
    local reason="$2"
    
    if [[ -f "$file" ]]; then
        echo -e "${YELLOW}Found: $file${NC}"
        echo -e "Reason: $reason"
        read -p "Remove this file? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            backup_file "$file" "$reason"
            rm "$file"
            log_action "REMOVED: $file (Reason: $reason)"
            echo -e "${GREEN}Removed: $file${NC}"
        else
            log_action "SKIPPED: $file (User declined)"
            echo -e "${BLUE}Skipped: $file${NC}"
        fi
        echo ""
    fi
}

# Function to check if file is referenced in other files
check_references() {
    local file="$1"
    local search_pattern="$(basename "$file")"
    
    echo -e "${BLUE}Checking references to: $file${NC}"
    local references=$(grep -r "$search_pattern" docs/ --exclude-dir=archive 2>/dev/null || true)
    
    if [[ -n "$references" ]]; then
        echo -e "${YELLOW}Found references:${NC}"
        echo "$references"
        echo ""
    else
        echo -e "${GREEN}No references found${NC}"
        echo ""
    fi
}

# Function to compare files
compare_files() {
    local file1="$1"
    local file2="$2"
    local description="$3"
    
    if [[ -f "$file1" && -f "$file2" ]]; then
        echo -e "${BLUE}Comparing: $file1 vs $file2${NC}"
        echo "Description: $description"
        
        local diff_output=$(diff "$file1" "$file2" 2>/dev/null || true)
        if [[ -z "$diff_output" ]]; then
            echo -e "${GREEN}Files are identical${NC}"
        else
            echo -e "${YELLOW}Files differ:${NC}"
            echo "$diff_output" | head -20
            if [[ $(echo "$diff_output" | wc -l) -gt 20 ]]; then
                echo "... (showing first 20 lines)"
            fi
        fi
        echo ""
    fi
}

echo -e "${BLUE}Step 1: Analyzing duplicate files${NC}"
echo "----------------------------------------"

# Check for duplicate OpenAPI specifications
compare_files "docs/openapi.yaml" "src/mw/docs/backend-openapi.yaml" "Backend OpenAPI specifications"
compare_files "docs/openapi.yaml" "docs/newopenapi.yaml" "OpenAPI specification versions"

# Check for duplicate specification files
compare_files "docs/CertM3-MiddlewareAppServerSoftwareDesignSpecification.md" "src/mw/docs/specs/CertM3-MiddlewareAppServerSoftwareDesignSpecification.md" "Middleware specification files"
compare_files "docs/CertM3-Signer-SoftwareDesignSpwcification.md" "src/mw/docs/specs/CertM3-Signer-SoftwareDesignSpwcification.md" "Signer specification files"

echo -e "${BLUE}Step 2: Checking for potentially deprecated files${NC}"
echo "------------------------------------------------"

# List files that might be deprecated
echo -e "${YELLOW}Files that might be deprecated:${NC}"
echo ""

# Development and planning files
for file in \
    "docs/clarifying-questions.md" \
    "docs/deferred-app-issues.md" \
    "docs/Issues.md" \
    "docs/new-oot-flow-for-app.md" \
    "docs/upgrade-v0.1.2-api-to-sign-certs.md" \
    "docs/app-api-discrepancies.txt"
do
    if [[ -f "$file" ]]; then
        echo -e "${YELLOW}  $file${NC}"
    fi
done

echo ""

# App-related files (potentially deprecated)
for file in \
    "docs/certm3-app-api-flow.md" \
    "docs/certm3-app-creation-plan.md"
do
    if [[ -f "$file" ]]; then
        echo -e "${YELLOW}  $file${NC}"
    fi
done

echo ""

# Outdated design files
for file in \
    "docs/app-design.md" \
    "docs/design-docs.md" \
    "docs/design-document.md"
do
    if [[ -f "$file" ]]; then
        echo -e "${YELLOW}  $file${NC}"
    fi
done

echo ""

echo -e "${BLUE}Step 3: Interactive cleanup${NC}"
echo "-------------------------------"

# Ask user if they want to proceed with interactive cleanup
read -p "Do you want to proceed with interactive file cleanup? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Cleanup skipped. Analysis complete.${NC}"
    echo "Check the analysis in: docs/documentation-cleanup-analysis.md"
    exit 0
fi

echo ""

# Interactive cleanup of duplicate files
echo -e "${BLUE}Checking for duplicate files to remove:${NC}"
echo ""

# Duplicate OpenAPI specs
if [[ -f "docs/openapi.yaml" && -f "src/mw/docs/backend-openapi.yaml" ]]; then
    remove_file "docs/openapi.yaml" "Duplicate of src/mw/docs/backend-openapi.yaml"
fi

# Duplicate specification files
if [[ -f "docs/CertM3-MiddlewareAppServerSoftwareDesignSpecification.md" && -f "src/mw/docs/specs/CertM3-MiddlewareAppServerSoftwareDesignSpecification.md" ]]; then
    remove_file "docs/CertM3-MiddlewareAppServerSoftwareDesignSpecification.md" "Duplicate of src/mw/docs/specs version"
fi

if [[ -f "docs/CertM3-Signer-SoftwareDesignSpwcification.md" && -f "src/mw/docs/specs/CertM3-Signer-SoftwareDesignSpwcification.md" ]]; then
    remove_file "docs/CertM3-Signer-SoftwareDesignSpwcification.md" "Duplicate of src/mw/docs/specs version"
fi

# Incomplete API spec
if [[ -f "src/api/src/openapi.yaml" ]]; then
    local line_count=$(wc -l < "src/api/src/openapi.yaml")
    if [[ $line_count -lt 100 ]]; then
        remove_file "src/api/src/openapi.yaml" "Incomplete API specification (only $line_count lines)"
    fi
fi

echo -e "${BLUE}Step 4: Checking file references${NC}"
echo "-------------------------------------"

# Check references for removed files
if [[ -d "$BACKUP_DIR" ]]; then
    echo -e "${BLUE}Checking references to removed files:${NC}"
    for file in "$BACKUP_DIR"/*; do
        if [[ -f "$file" ]]; then
            check_references "$file"
        fi
    done
fi

echo -e "${BLUE}Step 5: Summary${NC}"
echo "----------------"

echo -e "${GREEN}Cleanup completed!${NC}"
echo ""
echo "Backup directory: $BACKUP_DIR"
echo "Log file: $LOG_FILE"
echo "Analysis document: docs/documentation-cleanup-analysis.md"
echo ""

# Show what was removed
if [[ -d "$BACKUP_DIR" && "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]]; then
    echo -e "${YELLOW}Files removed (backed up):${NC}"
    ls -la "$BACKUP_DIR"
    echo ""
else
    echo -e "${BLUE}No files were removed.${NC}"
    echo ""
fi

echo -e "${BLUE}Next steps:${NC}"
echo "1. Review the analysis document: docs/documentation-cleanup-analysis.md"
echo "2. Test API specifications against running services"
echo "3. Update any broken references in remaining documentation"
echo "4. Consider creating a docs/development/ directory for planning files"
echo "5. Review and consolidate overlapping API documentation" 
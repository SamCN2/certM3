#!/bin/bash

# Upload CertM3 Package to GitHub
# Creates a release and uploads the pkg directory as a release asset
# Usage: ./upload-package-to-github.sh <version> [release_notes]
#        ./upload-package-to-github.sh --current [suffix] [release_notes]
# Version is required (e.g., v1.9.3)
# --current uploads current state to packages/ for testing

set -e

# Parse arguments
CURRENT_MODE=false
SUFFIX=""
VERSION=""
RELEASE_NOTES=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --current)
            CURRENT_MODE=true
            shift
            ;;
        -*)
            echo "❌ Error: Unknown option $1"
            echo "Usage: $0 <version> [release_notes]"
            echo "       $0 --current [suffix] [release_notes]"
            exit 1
            ;;
        *)
            if [ -z "$VERSION" ]; then
                VERSION="$1"
            elif [ -z "$SUFFIX" ] && [ "$CURRENT_MODE" = true ]; then
                SUFFIX="$1"
            elif [ -z "$RELEASE_NOTES" ]; then
                RELEASE_NOTES="$1"
            fi
            shift
            ;;
    esac
done

# Validate arguments
if [ "$CURRENT_MODE" = false ] && [ -z "$VERSION" ]; then
    echo "❌ Error: Version is required"
    echo "Usage: $0 <version> [release_notes]"
    echo "       $0 --current [suffix] [release_notes]"
    echo "Example: $0 v1.9.3 'Fixed winston type issues'"
    echo "Example: $0 --current testing 'Testing latest build'"
    exit 1
fi

# Set defaults
if [ "$CURRENT_MODE" = true ]; then
    SUFFIX=${SUFFIX:-"testing"}
    RELEASE_NOTES=${RELEASE_NOTES:-"CertM3 testing package $SUFFIX"}
    PACKAGE_NAME="certm3.pkg-$SUFFIX.tgz"
    echo "📤 CertM3 Package Uploader (Current Mode)"
    echo "Suffix: $SUFFIX"
    echo "Package: $PACKAGE_NAME"
else
    RELEASE_NOTES=${RELEASE_NOTES:-"CertM3 package release $VERSION"}
    PACKAGE_NAME="certm3-$VERSION.tar.gz"
    echo "📤 CertM3 Package Uploader"
    echo "Version: $VERSION"
fi

echo "Release Notes: $RELEASE_NOTES"
echo ""

# Check if pkg directory exists
if [ ! -d "pkg" ]; then
    echo "❌ pkg directory not found. Run ./scripts/build-package.sh first."
    exit 1
fi

# Safety checks only for release mode
if [ "$CURRENT_MODE" = false ]; then
    # Check if we're on the right git version
    CURRENT_TAG=$(git describe --tags --exact-match 2>/dev/null || echo "")
    if [ "$CURRENT_TAG" != "$VERSION" ]; then
        echo "⚠️  Warning: Current git tag ($CURRENT_TAG) doesn't match version ($VERSION)"
        echo "   This will upload whatever is currently built in pkg/"
        echo "   Consider: git checkout $VERSION && ./scripts/build-package.sh"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "❌ Aborted"
            exit 1
        fi
    fi

    # Check for uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        echo "⚠️  Warning: You have uncommitted changes"
        echo "   This will upload a package built from dirty state"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "❌ Aborted"
            exit 1
        fi
    fi

    # Check if pkg is fresh (built within last 10 minutes)
    PKG_AGE=$(find pkg -type f -mmin +10 2>/dev/null | wc -l)
    if [ "$PKG_AGE" -gt 0 ]; then
        echo "⚠️  Warning: pkg/ directory may be stale (some files older than 10 minutes)"
        echo "   Consider running: ./scripts/build-package.sh"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "❌ Aborted"
            exit 1
        fi
    fi
fi

# Create package archive
echo "📦 Creating package archive..."
tar -czf "$PACKAGE_NAME" pkg/

if [ "$CURRENT_MODE" = true ]; then
    # Upload to packages/ directory
    echo "🚀 Uploading to packages/ directory..."
    
    # Create packages directory if it doesn't exist
    mkdir -p packages/
    
    # Move package to packages directory
    mv "$PACKAGE_NAME" "packages/$PACKAGE_NAME"
    
    echo "✅ Package uploaded to packages/$PACKAGE_NAME"
    echo "Download URL: https://raw.githubusercontent.com/SamCN2/certM3/main/packages/$PACKAGE_NAME"
else
    # Create GitHub release
    echo "🚀 Creating GitHub release..."
    gh release create "$VERSION" \
        --title "CertM3 $VERSION" \
        --notes "$RELEASE_NOTES" \
        "$PACKAGE_NAME"
    
    echo "✅ Release created successfully!"
    echo "Download URL: https://github.com/SamCN2/certM3/releases/download/$VERSION/$PACKAGE_NAME"
    
    # Cleanup
    rm -f "$PACKAGE_NAME"
fi

echo "✅ Done!" 
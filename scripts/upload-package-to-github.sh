#!/bin/bash

# Upload CertM3 Package to GitHub
# Creates a release and uploads the pkg directory as a release asset
# Usage: ./upload-package-to-github.sh <version> [release_notes]
# Version is required (e.g., v1.9.3)

set -e

if [ -z "$1" ]; then
    echo "❌ Error: Version is required"
    echo "Usage: $0 <version> [release_notes]"
    echo "Example: $0 v1.9.3 'Fixed winston type issues'"
    exit 1
fi

VERSION="$1"
RELEASE_NOTES=${2:-"CertM3 package release $VERSION"}

echo "📤 CertM3 Package Uploader"
echo "Version: $VERSION"
echo "Release Notes: $RELEASE_NOTES"
echo ""

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

# Check if pkg directory exists and is recent
if [ ! -d "pkg" ]; then
    echo "❌ pkg directory not found. Run ./scripts/build-package.sh first."
    exit 1
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

# Create release archive
echo "📦 Creating release archive..."
tar -czf "certm3-$VERSION.tar.gz" pkg/

# Create GitHub release
echo "🚀 Creating GitHub release..."
gh release create "$VERSION" \
    --title "CertM3 $VERSION" \
    --notes "$RELEASE_NOTES" \
    "certm3-$VERSION.tar.gz"

echo "✅ Release created successfully!"
echo "Download URL: https://github.com/SamCN2/certM3/releases/download/$VERSION/certm3-$VERSION.tar.gz"

# Cleanup
rm -f "certm3-$VERSION.tar.gz"

echo "✅ Done!" 
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

# Check if pkg directory exists
if [ ! -d "pkg" ]; then
    echo "❌ pkg directory not found. Run ./scripts/build-package.sh first."
    exit 1
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
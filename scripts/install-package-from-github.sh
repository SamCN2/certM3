#!/bin/bash

# CertM3 Package Installer from GitHub
# This script downloads and installs the pre-built CertM3 package from GitHub
# Usage: ./install-package-from-github.sh [tag_or_branch] [install_dir]

set -e

# Configuration
REPO_URL="https://github.com/SamCN2/certM3"
DEFAULT_TAG="v1.9.2"
DEFAULT_INSTALL_DIR="/opt/certm3"

# Parse arguments
TAG_OR_BRANCH=${1:-$DEFAULT_TAG}
INSTALL_DIR=${2:-$DEFAULT_INSTALL_DIR}

echo "🔧 CertM3 Package Installer from GitHub"
echo "Repository: $REPO_URL"
echo "Version: $TAG_OR_BRANCH"
echo "Install Directory: $INSTALL_DIR"
echo ""

# Create temporary working directory
TEMP_DIR=$(mktemp -d)
echo "📁 Created temporary directory: $TEMP_DIR"

# Function to download a single file from GitHub
download_file() {
    local file_path="$1"
    local local_path="$2"
    local url="$REPO_URL/raw/$TAG_OR_BRANCH/$file_path"
    
    echo "⬇️  Downloading: $file_path"
    mkdir -p "$(dirname "$local_path")"
    if curl -s -L -f "$url" -o "$local_path"; then
        echo "✅ Downloaded: $file_path"
    else
        echo "❌ Failed to download: $file_path"
        return 1
    fi
}

# Download the pkg directory structure
echo "🚀 Starting download process..."

# Download the entire pkg directory structure
download_file "pkg/setup.sh" "$TEMP_DIR/pkg/setup.sh"
download_file "pkg/README.md" "$TEMP_DIR/pkg/README.md"
download_file "pkg/REQUIREMENTS" "$TEMP_DIR/pkg/REQUIREMENTS"
download_file "pkg/etc/config.default.yaml" "$TEMP_DIR/pkg/etc/config.default.yaml"
download_file "pkg/etc/certm3.pm2.config.js.default" "$TEMP_DIR/pkg/etc/certm3.pm2.config.js.default"
download_file "pkg/create_certm3_schema.sql" "$TEMP_DIR/pkg/create_certm3_schema.sql"
download_file "pkg/setup-database.sh" "$TEMP_DIR/pkg/setup-database.sh"

# Download API binaries and configs
download_file "pkg/api/dist/index.js" "$TEMP_DIR/pkg/api/dist/index.js"
download_file "pkg/api/package.json" "$TEMP_DIR/pkg/api/package.json"
download_file "pkg/api/node_modules" "$TEMP_DIR/pkg/api/node_modules" 2>/dev/null || echo "⚠️  Note: node_modules not found in repository (normal)"

# Download middleware binaries
download_file "pkg/bin/certm3-app" "$TEMP_DIR/pkg/bin/certm3-app"
download_file "pkg/bin/certm3-signer" "$TEMP_DIR/pkg/bin/certm3-signer"

# Download web frontend
download_file "pkg/static/index.html" "$TEMP_DIR/pkg/static/index.html"
download_file "pkg/static/index.js" "$TEMP_DIR/pkg/static/index.js"

# Download nginx configs
download_file "pkg/nginx/certm3.conf" "$TEMP_DIR/pkg/nginx/certm3.conf"
download_file "pkg/nginx/certm3-maps.conf" "$TEMP_DIR/pkg/nginx/certm3-maps.conf"
download_file "pkg/nginx/certm3-rate-limits.conf" "$TEMP_DIR/pkg/nginx/certm3-rate-limits.conf"

# Download scripts
download_file "pkg/scripts/test-database.sh" "$TEMP_DIR/pkg/scripts/test-database.sh"
download_file "pkg/scripts/test-models.sh" "$TEMP_DIR/pkg/scripts/test-models.sh"
download_file "pkg/scripts/test-api-flow.sh" "$TEMP_DIR/pkg/scripts/test-api-flow.sh"
download_file "pkg/scripts/health-check.sh" "$TEMP_DIR/pkg/scripts/health-check.sh"

# Download CA management files
download_file "pkg/CA-mgmt/README.md" "$TEMP_DIR/pkg/CA-mgmt/README.md"
download_file "pkg/CA-mgmt/config/openssl-intermediate.conf" "$TEMP_DIR/pkg/CA-mgmt/config/openssl-intermediate.conf"
download_file "pkg/CA-mgmt/config/openssl-root.conf" "$TEMP_DIR/pkg/CA-mgmt/config/openssl-root.conf"

echo "✅ All files downloaded successfully!"

# Make scripts executable
chmod +x "$TEMP_DIR/pkg/setup.sh"
chmod +x "$TEMP_DIR/pkg/setup-database.sh"
chmod +x "$TEMP_DIR/pkg/scripts/"*.sh
chmod +x "$TEMP_DIR/pkg/bin/"*

# Install the package
echo "🔨 Installing package..."
cd "$TEMP_DIR/pkg"

# Run the setup script
if ./setup.sh "$INSTALL_DIR"; then
    echo "✅ Package installed successfully!"
    echo ""
    echo "🎉 Installation complete!"
    echo "Location: $INSTALL_DIR"
    echo ""
    echo "Next steps:"
    echo "1. Configure the system: cd $INSTALL_DIR && ./setup-database.sh"
    echo "2. Start services: pm2 start etc/certm3.pm2.config.js"
    echo "3. Test the installation: ./scripts/health-check.sh"
else
    echo "❌ Package installation failed"
    exit 1
fi

# Cleanup
echo "🧹 Cleaning up temporary files..."
rm -rf "$TEMP_DIR"

echo "✅ Done!" 
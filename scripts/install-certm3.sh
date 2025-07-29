#!/bin/bash

# CertM3 Installer
# Downloads and installs the pre-built CertM3 package from GitHub
# Usage: ./install-certm3.sh [version] [install_dir]

set -e

REPO_URL="https://github.com/SamCN2/certM3"
VERSION=${1:-"v1.9.2"}
INSTALL_DIR=${2:-"/opt/certm3"}

echo "🔧 CertM3 Installer"
echo "Version: $VERSION"
echo "Install Directory: $INSTALL_DIR"
echo ""

# Create temp directory
TEMP_DIR=$(mktemp -d)
echo "📁 Created temporary directory: $TEMP_DIR"

# Download pkg directory from GitHub
echo "⬇️  Downloading package from GitHub..."
cd "$TEMP_DIR"

# Download the pkg directory structure
curl -s -L -f "$REPO_URL/archive/$VERSION.tar.gz" -o certm3.tar.gz
tar -xzf certm3.tar.gz
cd certm3-*

# Copy pkg directory to install location
if [ -d "pkg" ]; then
    echo "📦 Installing package..."
    sudo mkdir -p "$INSTALL_DIR"
    sudo cp -r pkg/* "$INSTALL_DIR/"
    
    # Make scripts executable
    sudo chmod +x "$INSTALL_DIR/setup.sh"
    sudo chmod +x "$INSTALL_DIR/setup-database.sh"
    sudo chmod +x "$INSTALL_DIR/scripts/"*.sh
    sudo chmod +x "$INSTALL_DIR/bin/"*
    
    echo "✅ Installation complete!"
    echo "Location: $INSTALL_DIR"
    echo ""
    echo "Next steps:"
    echo "1. Configure: cd $INSTALL_DIR && ./setup-database.sh"
    echo "2. Start services: pm2 start etc/certm3.pm2.config.js"
    echo "3. Test: ./scripts/health-check.sh"
else
    echo "❌ pkg directory not found in repository"
    exit 1
fi

# Cleanup
echo "🧹 Cleaning up..."
rm -rf "$TEMP_DIR"

echo "✅ Done!" 
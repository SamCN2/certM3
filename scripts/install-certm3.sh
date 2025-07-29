#!/bin/bash

# CertM3 Installer
# Downloads and installs the pre-built CertM3 package from GitHub
# Usage: ./install-certm3.sh [version] [install_dir]
#        ./install-certm3.sh --testing [suffix] [install_dir]
# If no version specified, uses the latest release
# --testing downloads from packages/ directory

set -e

REPO_URL="https://github.com/SamCN2/certM3"
INSTALL_DIR=${3:-"/opt/certm3"}

# Function to get latest version from GitHub
get_latest_version() {
    local latest_tag
    latest_tag=$(curl -s "https://api.github.com/repos/SamCN2/certM3/releases/latest" | grep '"tag_name"' | cut -d'"' -f4)
    if [ -z "$latest_tag" ]; then
        echo "❌ Could not determine latest version from GitHub"
        exit 1
    fi
    echo "$latest_tag"
}

# Check if testing mode
if [ "$1" = "--testing" ]; then
    SUFFIX=${2:-"testing"}
    PACKAGE_NAME="certm3.pkg-$SUFFIX.tgz"
    DOWNLOAD_URL="https://raw.githubusercontent.com/SamCN2/certM3/main/packages/$PACKAGE_NAME"
    
    echo "🔧 CertM3 Installer (Testing Mode)"
    echo "Package: $PACKAGE_NAME"
    echo "Install Directory: $INSTALL_DIR"
    echo ""
    
    # Create temp directory
    TEMP_DIR=$(mktemp -d)
    echo "📁 Created temporary directory: $TEMP_DIR"
    
    # Download package from packages/ directory
    echo "⬇️  Downloading testing package from GitHub..."
    cd "$TEMP_DIR"
    
    if curl -s -L -f "$DOWNLOAD_URL" -o "$PACKAGE_NAME"; then
        echo "✅ Downloaded: $PACKAGE_NAME"
    else
        echo "❌ Failed to download: $DOWNLOAD_URL"
        echo "   Available packages: https://github.com/SamCN2/certM3/tree/main/packages"
        exit 1
    fi
    
    # Extract and install
    echo "📦 Installing package..."
    tar -xzf "$PACKAGE_NAME"
    
    if [ -d "pkg" ]; then
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
        echo "❌ pkg directory not found in package"
        exit 1
    fi
    
    # Cleanup
    echo "🧹 Cleaning up..."
    rm -rf "$TEMP_DIR"
    
    echo "✅ Done!"
    exit 0
fi

# Determine version to install
if [ -n "$1" ]; then
    VERSION="$1"
    echo "🔧 CertM3 Installer"
    echo "Version: $VERSION (specified)"
else
    VERSION=$(get_latest_version)
    echo "🔧 CertM3 Installer"
    echo "Version: $VERSION (latest)"
fi

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
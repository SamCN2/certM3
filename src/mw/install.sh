#!/bin/bash

# Exit on error
set -e

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root"
    exit 1
fi

# Configuration
INSTALL_DIR="/opt/certm3/mw"
BIN_DIR="$INSTALL_DIR/bin"
CONFIG_DIR="$INSTALL_DIR/config"
LOG_DIR="/var/log/certm3/mw"
SYSTEMD_DIR="/etc/systemd/system"
USER="certm3"
GROUP="certm3"

# Create directories
echo "Creating directories..."
mkdir -p "$BIN_DIR"
mkdir -p "$CONFIG_DIR"
mkdir -p "$LOG_DIR"

# Create user and group if they don't exist
if ! id "$USER" &>/dev/null; then
    echo "Creating user $USER..."
    useradd -r -s /bin/false "$USER"
fi

# Set permissions
echo "Setting permissions..."
chown -R "$USER:$GROUP" "$INSTALL_DIR"
chown -R "$USER:$GROUP" "$LOG_DIR"
chmod 755 "$INSTALL_DIR"
chmod 755 "$BIN_DIR"
chmod 755 "$CONFIG_DIR"
chmod 755 "$LOG_DIR"

# Copy files
echo "Copying files..."
cp bin/certm3-app "$BIN_DIR/"
cp config.yaml.example "$CONFIG_DIR/config.yaml"
cp systemd/certm3-app.service "$SYSTEMD_DIR/"

# Set file permissions
chmod 755 "$BIN_DIR/certm3-app"
chmod 640 "$CONFIG_DIR/config.yaml"
chmod 644 "$SYSTEMD_DIR/certm3-app.service"

# Reload systemd
echo "Reloading systemd..."
systemctl daemon-reload

# Enable and start service
echo "Enabling and starting service..."
systemctl enable certm3-app
systemctl start certm3-app

echo "Installation complete!"
echo "Please review and edit the configuration at $CONFIG_DIR/config.yaml"
echo "Check service status with: systemctl status certm3-app" 
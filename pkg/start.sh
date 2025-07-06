#!/bin/bash

# Quick start script for CertM3
set -e

echo "Starting CertM3 services..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "PM2 not found. Installing..."
    npm install -g pm2
fi

# Create log directories
mkdir -p var/spool/certM3/logs

# Check if config.local.yaml exists, if not create from default
if [ ! -f "etc/config.local.yaml" ]; then
    echo "Creating config.local.yaml from default..."
    cp etc/config.default.yaml etc/config.local.yaml
    echo "IMPORTANT: Please edit etc/config.local.yaml with your actual FQDN and configuration values"
    echo "The default config contains placeholder values that need to be updated."
fi

# Start services
echo "Starting services with PM2..."
pm2 start etc/certm3.pm2.config.js

echo "Services started. Use 'pm2 list' to check status."
echo "Logs are available in var/spool/certM3/logs/"
echo ""
echo "Next steps:"
echo "1. Configure nginx using etc/nginx.certm3-skeleton.conf"
echo "2. Customize config in etc/config.local.yaml (if not already done)"
echo "3. Access the web interface at your configured domain"

#!/bin/bash

# CertM3 Setup Script
set -e

echo "=== CertM3 Setup ==="
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# Create log directories
echo "Creating log directories..."
mkdir -p var/spool/certM3/logs

# Check if config.yaml exists
if [ ! -f "config.yaml" ]; then
    echo ""
    echo "=== CONFIGURATION REQUIRED ==="
    echo "No config.yaml found. You must create one before starting CertM3."
    echo ""
    echo "Steps:"
    echo "1. Copy the example config: cp config-example.yaml config.yaml"
    echo "2. Edit config.yaml with your actual domain and settings:"
    echo "   - Replace 'your-domain.com' with your actual domain"
    echo "   - Update CA certificate paths (default: /etc/certm3/CA/)"
    echo "   - Set database credentials"
    echo "   - Configure organization details"
    echo ""
    echo "Example:"
    echo "   frontend_baseurl: 'https://certm3.example.com/app'"
    echo "   backend_baseurl: 'https://certm3.example.com/api'"
    echo "   ca_cert_path: '/etc/certm3/CA/certs/ca-cert.pem'"
    echo "   ca_key_path: '/etc/certm3/CA/private/ca-key.pem'"
    echo ""
    echo "3. Run this setup script again after configuration"
    echo ""
    exit 1
fi

# Check for placeholder values
if grep -q "your-domain.com" config.yaml; then
    echo ""
    echo "=== CONFIGURATION INCOMPLETE ==="
    echo "Your config.yaml still contains placeholder values."
    echo "Please edit config.yaml and replace 'your-domain.com' with your actual domain."
    echo ""
    echo "Required changes:"
    echo "- frontend_baseurl: 'https://your-domain.com/app'"
    echo "- backend_baseurl: 'https://your-domain.com/api'"
    echo "- crl_distribution_url: 'https://your-domain.com/crl/ca.crl'"
    echo "- aia_issuer_url: 'https://your-domain.com/certs/ca-cert.pem'"
    echo ""
    exit 1
fi

echo "Configuration looks good!"
echo ""

# Check if CA files exist (if using local paths)
if grep -q "ca_cert_path:" config.yaml; then
    ca_cert_path=$(grep "ca_cert_path:" config.yaml | cut -d'"' -f2)
    if [ ! -f "$ca_cert_path" ]; then
        echo "Warning: CA certificate not found at: $ca_cert_path"
        echo "Make sure your CA certificate exists before starting the signer."
        echo ""
    fi
fi

echo "=== Setup Complete ==="
echo ""
echo "To start CertM3 services:"
echo "  pm2 start etc/ecosystem.config.js"
echo ""
echo "To check status:"
echo "  pm2 list"
echo ""
echo "To view logs:"
echo "  pm2 logs"
echo ""
echo "To stop services:"
echo "  pm2 stop all"
echo ""
echo "To enable PM2 startup on boot:"
echo "  pm2 startup"
echo "  pm2 save"
echo ""
echo "Next steps:"
echo "1. Set up database: sudo -u postgres ./setup-database.sh"
echo "2. Configure nginx using etc/nginx.certm3-skeleton.conf"
echo "3. Access the web interface at your configured domain" 
#!/bin/bash
set -e

# Check for command line argument
if [ $# -eq 0 ]; then
    echo "ERROR: FQDN is required as command line argument!"
    echo "Usage: $0 <fqdn>"
    echo "Example: $0 urp.ogt11.com"
    exit 1
fi

CERTM3_FQDN="$1"

echo "=== CertM3 Container Initialization ==="
echo "Version: ${CERTM3_VERSION:-1.6.1}"
echo "FQDN: $CERTM3_FQDN"

# Function to handle shutdown gracefully
cleanup() {
    echo "Shutting down CertM3 services..."
    pm2 stop all || true
    pm2 delete all || true
    service nginx stop || true
    service postgresql stop || true
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Substitute FQDN in nginx config
echo "Configuring nginx for FQDN: $CERTM3_FQDN"
sed -i "s/\${CERTM3_FQDN}/$CERTM3_FQDN/g" /etc/nginx/sites-available/certm3

# Start PostgreSQL
echo "Starting PostgreSQL..."
service postgresql start

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h localhost -p 5432 -U postgres; do
    echo "PostgreSQL is not ready yet..."
    sleep 2
done
echo "PostgreSQL is ready!"

# Set up database
echo "Setting up database..."
/opt/certm3/setup-database.sh

# Set up CA
echo "Setting up CA..."
/opt/certm3/setup-ca.sh

# Start nginx
echo "Starting nginx..."
service nginx start

# Start CertM3 services with PM2
echo "Starting CertM3 services..."
cd /opt/certm3
pm2 start pkg/etc/certm3.pm2.config.js

# Show status
echo "CertM3 services status:"
pm2 status

echo "=== CertM3 Container Ready ==="
echo "Web interface: http://$CERTM3_FQDN"
echo "API endpoint: http://$CERTM3_FQDN/api"
echo "Health check: http://$CERTM3_FQDN/health"
echo "Logs: pm2 logs"

# Keep container running and monitor services
while true; do
    sleep 30
    # Check if services are still running
    if ! pm2 ping > /dev/null 2>&1; then
        echo "PM2 is not responding, restarting services..."
        pm2 restart all
    fi
done 
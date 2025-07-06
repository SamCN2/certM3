#!/bin/bash
set -e

echo "Setting up CertM3 CA..."

# Create CA directories if they don't exist
mkdir -p /var/spool/certM3/certs
mkdir -p /var/spool/certM3/private
mkdir -p /var/spool/certM3/newcerts
mkdir -p /var/spool/certM3/crl

# Set proper permissions
chown -R certm3:certm3 /var/spool/certM3
chmod 700 /var/spool/certM3/private
chmod 755 /var/spool/certM3/certs
chmod 755 /var/spool/certM3/newcerts
chmod 755 /var/spool/certM3/crl

# Check if CA already exists
if [ ! -f "/var/spool/certM3/private/ca.key" ] || [ ! -f "/var/spool/certM3/certs/ca.crt" ]; then
    echo "Creating new CA..."
    
    # Generate CA private key
    openssl genrsa -out /var/spool/certM3/private/ca.key 4096
    
    # Create CA certificate
    openssl req -new -x509 -days 3650 -key /var/spool/certM3/private/ca.key \
        -out /var/spool/certM3/certs/ca.crt \
        -subj "/C=US/ST=State/L=City/O=CertM3/OU=IT/CN=CertM3 Root CA"
    
    # Create index file
    touch /var/spool/certM3/index.txt
    
    # Create serial file
    echo "01" > /var/spool/certM3/serial
    
    # Set proper ownership
    chown certm3:certm3 /var/spool/certM3/private/ca.key
    chown certm3:certm3 /var/spool/certM3/certs/ca.crt
    chown certm3:certm3 /var/spool/certM3/index.txt
    chown certm3:certm3 /var/spool/certM3/serial
    
    echo "CA created successfully!"
else
    echo "CA already exists, skipping creation."
fi

echo "CA setup complete!" 
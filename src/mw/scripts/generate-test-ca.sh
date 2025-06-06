#!/bin/bash

# Create CA directory
mkdir -p /var/spool/certM3/mw/ca

# Generate CA private key
openssl genrsa -out /var/spool/certM3/mw/ca/ca-key.pem 2048

# Generate CA certificate
openssl req -new -x509 -key /var/spool/certM3/mw/ca/ca-key.pem \
    -out /var/spool/certM3/mw/ca/ca-cert.pem \
    -subj "/O=CertM3/OU=CertM3 Test CA/L=Test/ST=Test/C=US" \
    -days 3650

# Set permissions
chmod 600 /var/spool/certM3/mw/ca/ca-key.pem
chmod 644 /var/spool/certM3/mw/ca/ca-cert.pem 
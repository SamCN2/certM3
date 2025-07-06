#!/bin/bash
# create-root-ca.sh: Create a traditional OpenSSL root CA
# Usage: ./create-root-ca.sh <subject> <key-bits> <days>
# Example: ./create-root-ca.sh "/C=US/ST=State/L=City/O=Organization/CN=CertM3-Root-CA" 4096 3650

# Create a root CA for CertM3
set -e

# Get command line arguments
SUBJECT="${1:-/C=US/ST=Maryland/L=Bethesda/O=ogt11.com/OU=CertM3/CN=CertM3-Root-CA}"
KEY_BITS="${2:-4096}"
DAYS="${3:-3650}"

# Directories - use main CA directory
ROOT_DIR="../../CA"
ROOT_PRIVATE_DIR="$ROOT_DIR/private"
ROOT_CERTS_DIR="$ROOT_DIR/certs"

mkdir -p "$ROOT_PRIVATE_DIR"
mkdir -p "$ROOT_CERTS_DIR"

KEY_FILE="$ROOT_PRIVATE_DIR/ca.key"
CERT_FILE="$ROOT_CERTS_DIR/ca.crt"

# Generate root CA private key
openssl genrsa -out "$KEY_FILE" "$KEY_BITS"
chmod 600 "$KEY_FILE"

# Create root CA certificate
openssl req -new -x509 -key "$KEY_FILE" -out "$CERT_FILE" \
    -subj "$SUBJECT" -days "$DAYS" -sha256

# Create OpenSSL CA database files
touch "$ROOT_DIR/index.txt"
echo "01" > "$ROOT_DIR/serial"
echo "01" > "$ROOT_DIR/crlnumber"

echo "Root CA created successfully!"
echo "  Key: $KEY_FILE"
echo "  Certificate: $CERT_FILE"
echo "  Validity: $DAYS days"
echo ""
echo "IMPORTANT: Keep the private key secure and backed up!"
echo "You can now use OSSL-sign-intermediate-ca.sh to sign intermediate CAs." 
#!/bin/bash
# create-root-ca.sh: Create a traditional OpenSSL root CA
# Usage: ./create-root-ca.sh <subject> <key-bits> <days>
# Example: ./create-root-ca.sh "/C=US/ST=State/L=City/O=Organization/CN=CertM3-Root-CA" 4096 3650

set -e

SUBJECT="$1"      # e.g. "/C=US/ST=State/L=City/O=Organization/CN=CertM3-Root-CA"
KEY_BITS="$2"     # e.g. 4096
DAYS="$3"         # e.g. 3650 (10 years)

if [ -z "$SUBJECT" ] || [ -z "$KEY_BITS" ] || [ -z "$DAYS" ]; then
  echo "Usage: $0 <subject> <key-bits> <days>"
  exit 1
fi

ROOT_DIR="../certs/root"
mkdir -p "$ROOT_DIR"

KEY_FILE="$ROOT_DIR/ca.key"
CERT_FILE="$ROOT_DIR/ca.crt"

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
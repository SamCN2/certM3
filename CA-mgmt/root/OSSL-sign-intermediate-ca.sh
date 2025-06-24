#!/bin/bash
# OSSL-sign-intermediate-ca.sh: Sign an intermediate CA CSR with the root CA using OpenSSL
# Usage: ./OSSL-sign-intermediate-ca.sh <csr-file> <output-crt> <days>
# Example: ./OSSL-sign-intermediate-ca.sh ../certs/intermediate/user-ca/ca-renewal.csr ../certs/intermediate/user-ca/ca-renewal.crt 1825

set -e

CSR_FILE="$1"
OUTPUT_CRT="$2"
DAYS="$3"

if [ -z "$CSR_FILE" ] || [ -z "$OUTPUT_CRT" ] || [ -z "$DAYS" ]; then
  echo "Usage: $0 <csr-file> <output-crt> <days>"
  exit 1
fi

# Edit these paths as needed
ROOT_CA_CONF="../config/openssl-root.conf"
ROOT_CA_CERT="../certs/root/ca.crt"
ROOT_CA_KEY="../certs/root/ca.key"

# Check if root CA files exist
if [ ! -f "$ROOT_CA_CERT" ]; then
  echo "ERROR: Root CA certificate not found: $ROOT_CA_CERT"
  echo "Please create the root CA first using create-root-ca.sh"
  exit 1
fi

if [ ! -f "$ROOT_CA_KEY" ]; then
  echo "ERROR: Root CA private key not found: $ROOT_CA_KEY"
  echo "Please create the root CA first using create-root-ca.sh"
  exit 1
fi

# Sign the CSR with the root CA private key
openssl ca -config "$ROOT_CA_CONF" \
    -cert "$ROOT_CA_CERT" \
    -keyfile "$ROOT_CA_KEY" \
    -in "$CSR_FILE" \
    -out "$OUTPUT_CRT" \
    -days "$DAYS" \
    -extensions v3_intermediate_ca

echo "Signed intermediate CA certificate: $OUTPUT_CRT"
echo "Note: This certificate was signed using the OpenSSL root CA key." 
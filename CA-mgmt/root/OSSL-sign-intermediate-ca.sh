#!/bin/bash
# OSSL-sign-intermediate-ca.sh: Sign an intermediate CA CSR with the root CA
# Example: ./OSSL-sign-intermediate-ca.sh ../certs/intermediate/user-ca/ca-renewal.csr ../certs/intermediate/user-ca/ca-renewal.crt 1825

set -e

# Get command line arguments
CSR_FILE="$1"
CERT_FILE="$2"
DAYS="${3:-1825}"

if [ -z "$CSR_FILE" ] || [ -z "$CERT_FILE" ]; then
    echo "Usage: $0 <csr-file> <cert-file> [days]"
    echo "Example: $0 ../../CA/intermediate/user-ca/certs/ca.csr ../../CA/intermediate/user-ca/certs/ca.crt 1825"
    exit 1
fi

# Directories - use main CA directory
ROOT_CA_CERT="../../CA/certs/ca.crt"
ROOT_CA_KEY="../../CA/private/ca.key"

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
openssl ca -config "../config/openssl-root.conf" \
    -cert "$ROOT_CA_CERT" \
    -keyfile "$ROOT_CA_KEY" \
    -in "$CSR_FILE" \
    -out "$CERT_FILE" \
    -days "$DAYS" \
    -extensions v3_intermediate_ca

echo "Signed intermediate CA certificate: $CERT_FILE"
echo "Note: This certificate was signed using the OpenSSL root CA key." 
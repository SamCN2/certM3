#!/bin/bash
# create-api-ca.sh: Create a new API intermediate CA (key and CSR)
# Usage: ./create-api-ca.sh "/CN=CertM3-API-CA" 4096

set -e

SUBJECT="$1"      # e.g. "/CN=CertM3-API-CA"
KEY_BITS="$2"     # e.g. 4096

if [ -z "$SUBJECT" ] || [ -z "$KEY_BITS" ]; then
  echo "Usage: $0 <subject> <key-bits>"
  exit 1
fi

CA_DIR="../certs/intermediate/api-ca"
mkdir -p "$CA_DIR"
KEY_FILE="$CA_DIR/ca.key"
CSR_FILE="$CA_DIR/ca.csr"

openssl genrsa -out "$KEY_FILE" "$KEY_BITS"
chmod 600 "$KEY_FILE"
openssl req -new -key "$KEY_FILE" -out "$CSR_FILE" -subj "$SUBJECT"

echo "API intermediate CA key and CSR created."
echo "  Key: $KEY_FILE"
echo "  CSR: $CSR_FILE"
echo "Sign the CSR with the root CA (see CA-mgmt/root/sign-intermediate-ca.sh)." 
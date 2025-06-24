#!/bin/bash
# renew-ca.sh: Renew an intermediate CA certificate using the same key
# Usage: ./renew-ca.sh <ca-type> <subject> <days>
# Example: ./renew-ca.sh user-ca "/CN=CertM3-User-CA" 1825

set -e

CA_TYPE="$1"      # user-ca, database-ca, api-ca
SUBJECT="$2"      # e.g. "/CN=CertM3-User-CA"
DAYS="$3"         # e.g. 1825 (5 years)

if [ -z "$CA_TYPE" ] || [ -z "$SUBJECT" ] || [ -z "$DAYS" ]; then
  echo "Usage: $0 <ca-type> <subject> <days>"
  exit 1
fi

CA_DIR="../certs/intermediate/$CA_TYPE"
KEY_FILE="$CA_DIR/ca.key"
CSR_FILE="$CA_DIR/ca-renewal.csr"
CRT_FILE="$CA_DIR/ca-renewal.crt"

if [ ! -f "$KEY_FILE" ]; then
  echo "ERROR: Key file not found: $KEY_FILE"
  exit 1
fi

# Generate new CSR with same key
openssl req -new -key "$KEY_FILE" -out "$CSR_FILE" -subj "$SUBJECT"

echo "CSR generated at $CSR_FILE."
echo "Now sign this CSR with the root CA (see CA-mgmt/root/sign-intermediate-ca.sh)."
echo "After signing, place the new certificate at $CRT_FILE and replace $CA_DIR/ca.crt with it." 
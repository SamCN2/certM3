#!/bin/bash
# create-user-ca.sh: Create a new user intermediate CA (key and CSR)
# Usage: ./create-user-ca.sh "/CN=CertM3-User-CA" 4096

set -e

SUBJECT="$1"      # e.g. "/CN=CertM3-User-CA"
KEY_BITS="$2"     # e.g. 4096

if [ -z "$SUBJECT" ] || [ -z "$KEY_BITS" ]; then
  echo "Usage: $0 <subject> <key-bits>"
  exit 1
fi

CA_DIR="../certs/intermediate/user-ca"
mkdir -p "$CA_DIR"
KEY_FILE="$CA_DIR/ca.key"
CSR_FILE="$CA_DIR/ca.csr"

# Create full subject with required fields to match root CA policy
FULL_SUBJECT="/C=US/ST=State/L=City/O=Organization$SUBJECT"

openssl genrsa -out "$KEY_FILE" "$KEY_BITS"
chmod 600 "$KEY_FILE"
openssl req -new -key "$KEY_FILE" -out "$CSR_FILE" -subj "$FULL_SUBJECT"

echo "User intermediate CA key and CSR created."
echo "  Key: $KEY_FILE"
echo "  CSR: $CSR_FILE"
echo "  Subject: $FULL_SUBJECT"
echo "Sign the CSR with the root CA (see CA-mgmt/root/sign-intermediate-ca.sh)." 
#!/bin/bash
# create-user-ca.sh: Create a new user intermediate CA (key and CSR)
# Usage: ./create-user-ca.sh "/CN=CertM3-User-CA" 4096

# Create a user intermediate CA for CertM3
set -e

# Configuration
CA_TYPE="user-ca"
CA_NAME="CertM3-User-CA"
CA_COUNTRY="US"
CA_STATE="Maryland"
CA_LOCALITY="Bethesda"
CA_ORGANIZATION="ogt11.com"
CA_ORGANIZATIONAL_UNIT="CertM3"
CA_EMAIL="admin@ogt11.com"
CA_VALIDITY_DAYS=1825  # 5 years

# Directories - use main CA directory
CA_DIR="../../CA/intermediate/$CA_TYPE"
CA_PRIVATE_DIR="$CA_DIR/private"
CA_CERTS_DIR="$CA_DIR/certs"

# Configuration
SUBJECT="$1"      # e.g. "/CN=CertM3-User-CA"
KEY_BITS="$2"     # e.g. 4096

if [ -z "$SUBJECT" ] || [ -z "$KEY_BITS" ]; then
  echo "Usage: $0 <subject> <key-bits>"
  exit 1
fi

mkdir -p "$CA_PRIVATE_DIR"
mkdir -p "$CA_CERTS_DIR"
KEY_FILE="$CA_PRIVATE_DIR/ca.key"
CSR_FILE="$CA_CERTS_DIR/ca.csr"

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
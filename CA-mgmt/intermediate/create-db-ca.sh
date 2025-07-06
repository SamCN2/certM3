#!/bin/bash
# create-db-ca.sh: Create a new database intermediate CA (key and CSR)
# Usage: ./create-db-ca.sh "/CN=CertM3-Database-CA" 4096

# Create a database intermediate CA for CertM3
set -e

# Get command line arguments
SUBJECT="${1:-/CN=CertM3-Database-CA}"
KEY_BITS="${2:-4096}"

# Configuration
CA_TYPE="database-ca"
CA_NAME="CertM3-Database-CA"
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

mkdir -p "$CA_PRIVATE_DIR"
mkdir -p "$CA_CERTS_DIR"

KEY_FILE="$CA_PRIVATE_DIR/ca.key"
CSR_FILE="$CA_CERTS_DIR/ca.csr"

openssl genrsa -out "$KEY_FILE" "$KEY_BITS"
chmod 600 "$KEY_FILE"
openssl req -new -key "$KEY_FILE" -out "$CSR_FILE" -subj "$SUBJECT"

echo "Database intermediate CA key and CSR created."
echo "  Key: $KEY_FILE"
echo "  CSR: $CSR_FILE"
echo "Sign the CSR with the root CA (see CA-mgmt/root/sign-intermediate-ca.sh)." 
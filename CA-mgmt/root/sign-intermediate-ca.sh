#!/bin/bash
# sign-intermediate-ca.sh: Sign an intermediate CA CSR with the root CA (Yubikey PIV slot 9a)
# Usage: ./sign-intermediate-ca.sh <csr-file> <output-crt> <days>
# Example: ./sign-intermediate-ca.sh ../certs/intermediate/user-ca/ca-renewal.csr ../certs/intermediate/user-ca/ca-renewal.crt 1825

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
# Yubikey PKCS#11 engine and slot
PKCS11_ENGINE="pkcs11"
PKCS11_MODULE="/usr/lib/x86_64-linux-gnu/opensc-pkcs11.so"
YUBIKEY_SLOT="01"  # slot 9a is 01 in pkcs11

# Sign the CSR with the root CA private key on Yubikey
openssl ca -config "$ROOT_CA_CONF" \
    -engine $PKCS11_ENGINE -keyform engine \
    -cert "$ROOT_CA_CERT" \
    -keyfile "pkcs11:token=YubiKey%20PIV;id=%YUBIKEY_SLOT%" \
    -in "$CSR_FILE" \
    -out "$OUTPUT_CRT" \
    -days "$DAYS" \
    -extensions v3_intermediate_ca

echo "Signed intermediate CA certificate: $OUTPUT_CRT" 
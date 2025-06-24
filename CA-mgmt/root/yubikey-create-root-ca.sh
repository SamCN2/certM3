#!/bin/bash
# yubikey-create-root-ca.sh: Create a root CA on Yubikey (PIV applet)
# Usage: ./yubikey-create-root-ca.sh <subject> <days>
# Example: ./yubikey-create-root-ca.sh "/C=US/ST=State/L=City/O=Organization/CN=CertM3-Root-CA" 3650

set -e

SUBJECT="$1"      # e.g. "/C=US/ST=State/L=City/O=Organization/CN=CertM3-Root-CA"
DAYS="$2"         # e.g. 3650 (10 years)

if [ -z "$SUBJECT" ] || [ -z "$DAYS" ]; then
  echo "Usage: $0 <subject> <days>"
  exit 1
fi

ROOT_DIR="../certs/root"
mkdir -p "$ROOT_DIR"

PUBLIC_KEY_FILE="$ROOT_DIR/ca.pub"
CERT_FILE="$ROOT_DIR/ca.crt"
SLOT="9a"  # Authentication slot

echo "Creating root CA on Yubikey (slot $SLOT)..."
echo "Make sure your Yubikey is connected and unlocked."

# Generate root CA key on Yubikey
yubico-piv-tool -a generate -s $SLOT -o "$PUBLIC_KEY_FILE"

# Create root CA certificate
openssl req -new -x509 -key "$PUBLIC_KEY_FILE" -out "$CERT_FILE" \
    -subj "$SUBJECT" -days "$DAYS" -sha256

# Import certificate to Yubikey
yubico-piv-tool -a import-certificate -s $SLOT -i "$CERT_FILE"

echo "Root CA created successfully on Yubikey!"
echo "  Slot: $SLOT"
echo "  Public Key: $PUBLIC_KEY_FILE"
echo "  Certificate: $CERT_FILE"
echo "  Validity: $DAYS days"
echo ""
echo "IMPORTANT: Keep your Yubikey secure!"
echo "You can now use yubikey-sign-intermediate-ca.sh to sign intermediate CAs." 
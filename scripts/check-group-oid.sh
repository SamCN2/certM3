#!/bin/bash
# Usage: ./check-group-oid.sh <certificate.pem>
# Checks for the presence of the group OID 1.3.6.1.4.1.10049.2 in the certificate

CERT_FILE="$1"
OID="1.3.6.1.4.1.10049.2"

if [ -z "$CERT_FILE" ]; then
  echo "Usage: $0 <certificate.pem>"
  exit 1
fi

if ! [ -f "$CERT_FILE" ]; then
  echo "File not found: $CERT_FILE"
  exit 2
fi

# Dump ASN.1 structure and search for the OID
ASN1_OUTPUT=$(openssl x509 -in "$CERT_FILE" -outform DER | openssl asn1parse -inform DER)

if echo "$ASN1_OUTPUT" | grep -q "$OID"; then
  echo "OID $OID found in $CERT_FILE!"
  echo "--- Context ---"
  echo "$ASN1_OUTPUT" | grep -A 10 -B 5 "$OID"
else
  echo "OID $OID NOT found in $CERT_FILE."
fi 
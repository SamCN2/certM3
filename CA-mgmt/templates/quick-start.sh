#!/bin/bash
# quick-start.sh: Quick start guide for CA setup
# This script demonstrates the complete CA setup process

set -e

echo "=== CertM3 CA Management Quick Start ==="
echo "This script demonstrates the CA setup process."
echo "Run each section manually as needed."
echo ""

echo "=== 1. Prerequisites ==="
echo "Ensure you have:"
echo "  - OpenSSL"
echo "  - For Yubikey: yubico-piv-tool and Yubikey with PIV applet"
echo "  - Administrative access"
echo ""

echo "=== 2. Create Root CA ==="
echo "Choose your approach:"
echo ""
echo "Option A: Yubikey Root CA (Recommended for Production)"
echo "cd CA-mgmt/root"
echo "./yubikey-create-root-ca.sh \"/CN=CertM3-Root-CA\" 3650"
echo ""
echo "Option B: OpenSSL Root CA (Development/Testing)"
echo "cd CA-mgmt/root"
echo "./create-root-ca.sh \"/CN=CertM3-Root-CA\" 4096 3650"
echo ""

echo "=== 3. Create Intermediate CAs ==="
echo "cd CA-mgmt/intermediate"
echo "./create-user-ca.sh \"/CN=CertM3-User-CA\" 4096"
echo "./create-db-ca.sh \"/CN=CertM3-Database-CA\" 4096"
echo "./create-api-ca.sh \"/CN=CertM3-API-CA\" 4096"
echo ""

echo "=== 4. Sign Intermediate CAs ==="
echo "Choose your signing method:"
echo ""
echo "For Yubikey Root CA:"
echo "cd CA-mgmt/root"
echo "./yubikey-sign-intermediate-ca.sh ../certs/intermediate/user-ca/ca.csr \\"
echo "    ../certs/intermediate/user-ca/ca.crt 1825"
echo ""
echo "For OpenSSL Root CA:"
echo "cd CA-mgmt/root"
echo "./OSSL-sign-intermediate-ca.sh ../certs/intermediate/user-ca/ca.csr \\"
echo "    ../certs/intermediate/user-ca/ca.crt 1825"
echo ""

echo "=== 5. Generate Database Certificates ==="
echo "mkdir -p CA-mgmt/certs/services/database"
echo "openssl req -new -keyout CA-mgmt/certs/services/database/server.key \\"
echo "    -out CA-mgmt/certs/services/database/server.csr \\"
echo "    -subj \"/CN=postgres-server\""
echo "openssl ca -config CA-mgmt/config/openssl-intermediate.conf \\"
echo "    -in CA-mgmt/certs/services/database/server.csr \\"
echo "    -out CA-mgmt/certs/services/database/server.crt \\"
echo "    -extensions server_cert"
echo ""

echo "=== 6. Test Monitoring ==="
echo "cd CA-mgmt/monitoring"
echo "./check-expiration.sh"
echo ""

echo "=== 7. Integration ==="
echo "See CA-mgmt/INTEGRATION.md for detailed integration examples."
echo ""

echo "=== 8. Security Setup ==="
echo "Set proper permissions:"
echo "chmod 600 CA-mgmt/certs/**/*.key"
echo "chmod 644 CA-mgmt/certs/**/*.crt"
echo ""

echo "=== Complete! ==="
echo "Your CA infrastructure is ready for use with CertM3." 
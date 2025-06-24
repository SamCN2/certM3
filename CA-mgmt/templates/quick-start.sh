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
echo "  - Yubikey with PIV applet configured"
echo "  - OpenSSL with PKCS#11 support"
echo "  - Administrative access"
echo ""

echo "=== 2. Create Intermediate CAs ==="
echo "cd CA-mgmt/intermediate"
echo "./create-user-ca.sh \"/CN=CertM3-User-CA\" 4096"
echo "./create-db-ca.sh \"/CN=CertM3-Database-CA\" 4096"
echo "./create-api-ca.sh \"/CN=CertM3-API-CA\" 4096"
echo ""

echo "=== 3. Sign Intermediate CAs (requires Yubikey) ==="
echo "cd CA-mgmt/root"
echo "./sign-intermediate-ca.sh ../certs/intermediate/user-ca/ca.csr \\"
echo "    ../certs/intermediate/user-ca/ca.crt 1825"
echo "./sign-intermediate-ca.sh ../certs/intermediate/database-ca/ca.csr \\"
echo "    ../certs/intermediate/database-ca/ca.crt 1095"
echo "./sign-intermediate-ca.sh ../certs/intermediate/api-ca/ca.csr \\"
echo "    ../certs/intermediate/api-ca/ca.crt 1095"
echo ""

echo "=== 4. Generate Database Certificates ==="
echo "mkdir -p CA-mgmt/certs/services/database"
echo "openssl req -new -keyout CA-mgmt/certs/services/database/server.key \\"
echo "    -out CA-mgmt/certs/services/database/server.csr \\"
echo "    -subj \"/CN=postgres-server\""
echo "openssl ca -config CA-mgmt/config/openssl-intermediate.conf \\"
echo "    -in CA-mgmt/certs/services/database/server.csr \\"
echo "    -out CA-mgmt/certs/services/database/server.crt \\"
echo "    -extensions server_cert"
echo ""

echo "=== 5. Test Monitoring ==="
echo "cd CA-mgmt/monitoring"
echo "./check-expiration.sh"
echo ""

echo "=== 6. Integration ==="
echo "See CA-mgmt/INTEGRATION.md for detailed integration examples."
echo ""

echo "=== 7. Security Setup ==="
echo "Set proper permissions:"
echo "chmod 600 CA-mgmt/certs/**/*.key"
echo "chmod 644 CA-mgmt/certs/**/*.crt"
echo ""

echo "=== Complete! ==="
echo "Your CA infrastructure is ready for use with CertM3." 
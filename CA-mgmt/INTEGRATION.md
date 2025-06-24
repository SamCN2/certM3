# CA Management Integration Guide

This document provides examples and integration instructions for using the CA management scripts with CertM3 components.

## Prerequisites

- Yubikey with PIV applet configured
- OpenSSL with PKCS#11 support
- Administrative access to the system
- CertM3 source code

## Initial Setup

### 1. Create Root CA on Yubikey

First, create the root CA on your Yubikey (manual operation):

```bash
# Generate root CA key on Yubikey (slot 9a)
yubico-piv-tool -a generate -s 9a -o root-ca.pub

# Create root CA certificate
openssl req -new -x509 -key root-ca.pub -out CA-mgmt/certs/root/ca.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=CertM3-Root-CA" \
    -days 3650 -sha256

# Import certificate to Yubikey
yubico-piv-tool -a import-certificate -s 9a -i CA-mgmt/certs/root/ca.crt
```

### 2. Create Intermediate CAs

Create the intermediate CAs for different purposes:

```bash
cd CA-mgmt/intermediate

# Create user CA (for signing user certificates)
./create-user-ca.sh "/CN=CertM3-User-CA" 4096

# Create database CA (for PostgreSQL mTLS)
./create-db-ca.sh "/CN=CertM3-Database-CA" 4096

# Create API CA (for API service certificates)
./create-api-ca.sh "/CN=CertM3-API-CA" 4096
```

### 3. Sign Intermediate CAs with Root CA

Sign each intermediate CA CSR with the root CA (requires Yubikey):

```bash
cd CA-mgmt/root

# Sign user CA
./sign-intermediate-ca.sh ../certs/intermediate/user-ca/ca.csr \
    ../certs/intermediate/user-ca/ca.crt 1825

# Sign database CA
./sign-intermediate-ca.sh ../certs/intermediate/database-ca/ca.csr \
    ../certs/intermediate/database-ca/ca.crt 1095

# Sign API CA
./sign-intermediate-ca.sh ../certs/intermediate/api-ca/ca.csr \
    ../certs/intermediate/api-ca/ca.crt 1095
```

## Integration Examples

### 1. Database mTLS Setup

Generate PostgreSQL server and client certificates:

```bash
# Create database service certificates directory
mkdir -p CA-mgmt/certs/services/database

# Generate server certificate
openssl req -new -keyout CA-mgmt/certs/services/database/server.key \
    -out CA-mgmt/certs/services/database/server.csr \
    -subj "/CN=postgres-server"

# Sign with database CA
openssl ca -config CA-mgmt/config/openssl-intermediate.conf \
    -in CA-mgmt/certs/services/database/server.csr \
    -out CA-mgmt/certs/services/database/server.crt \
    -extensions server_cert

# Generate client certificate
openssl req -new -keyout CA-mgmt/certs/services/database/client.key \
    -out CA-mgmt/certs/services/database/client.csr \
    -subj "/CN=certm3-db-client"

# Sign with database CA
openssl ca -config CA-mgmt/config/openssl-intermediate.conf \
    -in CA-mgmt/certs/services/database/client.csr \
    -out CA-mgmt/certs/services/database/client.crt \
    -extensions client_cert
```

Update PostgreSQL configuration:

```bash
# Copy certificates to PostgreSQL
sudo cp CA-mgmt/certs/services/database/server.crt /etc/postgresql/ssl/
sudo cp CA-mgmt/certs/services/database/server.key /etc/postgresql/ssl/
sudo cp CA-mgmt/certs/root/ca.crt /etc/postgresql/ssl/

# Set permissions
sudo chown postgres:postgres /etc/postgresql/ssl/*
sudo chmod 600 /etc/postgresql/ssl/*.key
sudo chmod 644 /etc/postgresql/ssl/*.crt
```

Update `postgresql.conf`:
```ini
ssl = on
ssl_cert_file = '/etc/postgresql/ssl/server.crt'
ssl_key_file = '/etc/postgresql/ssl/server.key'
ssl_ca_file = '/etc/postgresql/ssl/ca.crt'
```

Update `pg_hba.conf`:
```
hostssl certm3 certm3_user 0.0.0.0/0 cert clientcert=1
```

### 2. CertM3 Signer Integration

The CertM3 signer (Go middleware) reads the user CA certificate and key:

```go
// Example Go code for CertM3 signer
type CASigner struct {
    caCert    *x509.Certificate
    caKey     crypto.PrivateKey
}

func NewCASigner() (*CASigner, error) {
    // Read CA certificate
    caCertPEM, err := os.ReadFile("CA-mgmt/certs/intermediate/user-ca/ca.crt")
    if err != nil {
        return nil, fmt.Errorf("failed to read CA cert: %v", err)
    }
    
    // Read CA private key
    caKeyPEM, err := os.ReadFile("CA-mgmt/certs/intermediate/user-ca/ca.key")
    if err != nil {
        return nil, fmt.Errorf("failed to read CA key: %v", err)
    }
    
    // Parse certificate and key
    caCert, err := x509.ParseCertificate(caCertPEM)
    if err != nil {
        return nil, fmt.Errorf("failed to parse CA cert: %v", err)
    }
    
    caKey, err := x509.ParsePKCS1PrivateKey(caKeyPEM)
    if err != nil {
        return nil, fmt.Errorf("failed to parse CA key: %v", err)
    }
    
    return &CASigner{
        caCert: caCert,
        caKey:  caKey,
    }, nil
}

func (s *CASigner) SignUserCertificate(csrPEM []byte) ([]byte, error) {
    // Parse CSR
    csr, err := x509.ParseCertificateRequest(csrPEM)
    if err != nil {
        return nil, fmt.Errorf("failed to parse CSR: %v", err)
    }
    
    // Create certificate template
    template := &x509.Certificate{
        SerialNumber: big.NewInt(time.Now().UnixNano()),
        Subject:      csr.Subject,
        NotBefore:    time.Now(),
        NotAfter:     time.Now().AddDate(1, 0, 0), // 1 year
        KeyUsage:     x509.KeyUsageDigitalSignature | x509.KeyUsageKeyEncipherment,
        ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},
    }
    
    // Sign certificate
    certDER, err := x509.CreateCertificate(rand.Reader, template, s.caCert, csr.PublicKey, s.caKey)
    if err != nil {
        return nil, fmt.Errorf("failed to create certificate: %v", err)
    }
    
    return pem.EncodeToMemory(&pem.Block{
        Type:  "CERTIFICATE",
        Bytes: certDER,
    }), nil
}
```

### 3. API Configuration

Update the API datasource configuration for mTLS:

```typescript
// src/api/src/datasources/postgres.datasource.ts
import * as fs from 'fs';

const config = {
  name: 'postgres',
  connector: 'postgresql',
  host: 'your-db-server-ip',
  port: 5432,
  user: 'certm3_user',
  database: 'certm3',
  schema: 'public',
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('CA-mgmt/certs/root/ca.crt'),
    key: fs.readFileSync('CA-mgmt/certs/services/database/client.key'),
    cert: fs.readFileSync('CA-mgmt/certs/services/database/client.crt')
  },
  transactionSupport: true,
  isolationLevel: 'READ COMMITTED'
};
```

## CA Renewal Process

When an intermediate CA is about to expire, use the key rotation process:

```bash
cd CA-mgmt/intermediate

# 1. Check expiration
cd ../monitoring
./check-expiration.sh

# 2. Renew CA certificate (same key, new cert)
cd ../intermediate
./renew-ca.sh user-ca "/CN=CertM3-User-CA" 1825

# 3. Sign with root CA
cd ../root
./sign-intermediate-ca.sh ../certs/intermediate/user-ca/ca-renewal.csr \
    ../certs/intermediate/user-ca/ca-renewal.crt 1825

# 4. Replace old certificate
cd ../intermediate
mv certs/intermediate/user-ca/ca.crt certs/intermediate/user-ca/ca.crt.old
mv certs/intermediate/user-ca/ca-renewal.crt certs/intermediate/user-ca/ca.crt

# 5. Restart services that use this CA
sudo systemctl restart certm3-signer
```

## Monitoring Setup

Set up automated monitoring:

```bash
# Add to crontab for daily checks
echo "0 9 * * * cd /path/to/certM3/CA-mgmt/monitoring && ./check-expiration.sh | mail -s 'CA Certificate Expiration Alert' admin@example.com" | crontab -
```

## Security Considerations

1. **File Permissions**: Ensure proper permissions on CA directories and files
2. **Access Control**: Restrict access to CA-mgmt directory
3. **Backup**: Regularly backup CA configuration and certificates
4. **Audit**: Log all CA operations
5. **Key Rotation**: Plan for root CA key rotation (every 10 years)

## Troubleshooting

### Common Issues

1. **Yubikey not detected**: Ensure OpenSC is installed and Yubikey is properly configured
2. **Permission denied**: Check file permissions on CA keys and certificates
3. **Certificate validation failed**: Verify certificate chain and trust relationships
4. **OpenSSL configuration errors**: Check paths in OpenSSL configuration files

### Debug Commands

```bash
# Check Yubikey status
yubico-piv-tool -a status

# Verify certificate chain
openssl verify -CAfile CA-mgmt/certs/root/ca.crt CA-mgmt/certs/intermediate/user-ca/ca.crt

# Check certificate details
openssl x509 -in CA-mgmt/certs/intermediate/user-ca/ca.crt -text -noout

# Test PostgreSQL connection
psql "sslmode=verify-full sslrootcert=CA-mgmt/certs/root/ca.crt sslcert=CA-mgmt/certs/services/database/client.crt sslkey=CA-mgmt/certs/services/database/client.key host=your-db-server-ip dbname=certm3 user=certm3_user"
```

## Next Steps

1. Test the CA setup in a development environment
2. Implement proper backup and recovery procedures
3. Set up monitoring and alerting
4. Document operational procedures for your team
5. Plan for future CA key rotations

---

For additional support, refer to the main CA-mgmt README.md and the CertM3 project documentation. 
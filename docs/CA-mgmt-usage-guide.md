# 🔐 CA-mgmt Scripts Usage Guide

The `CA-mgmt` directory contains a complete Certificate Authority management system for CertM3. This guide provides comprehensive instructions for using all CA management scripts and tools.

## 📋 **Quick Start (Recommended)**

For the fastest setup, use the template script:

```bash
cd CA-mgmt/templates
./quick-start.sh
```

This will show you the complete workflow step-by-step.

## 🔑 **Root CA Operations**

### **Option 1: Yubikey Root CA (Production - Recommended)**

**Security**: Root CA private key is stored on Yubikey (PIV applet) and never leaves the device.

**Prerequisites:**
- Yubikey with PIV applet
- `yubico-piv-tool` installed
- OpenSSL with PKCS#11 support

**Create Root CA:**
```bash
cd CA-mgmt/root
./yubikey-create-root-ca.sh "/CN=CertM3-Root-CA" 3650
```

**Sign Intermediate CAs:**
```bash
./yubikey-sign-intermediate-ca.sh ../certs/intermediate/user-ca/ca.csr \
    ../certs/intermediate/user-ca/ca.crt 1825
```

**Security Benefits:**
- ✅ **Highest Security**: Private key never leaves Yubikey
- ✅ **Physical Protection**: Requires physical access to Yubikey
- ✅ **Tamper Resistant**: Hardware security module
- ❌ **Dependency**: Requires Yubikey for all operations
- ❌ **Cost**: Requires Yubikey hardware

### **Option 2: OpenSSL Root CA (Development/Testing)**

**Security**: Root CA private key is stored as a file on the filesystem.

**Create Root CA:**
```bash
cd CA-mgmt/root
./create-root-ca.sh "/CN=CertM3-Root-CA" 4096 3650
```

**Sign Intermediate CAs:**
```bash
./OSSL-sign-intermediate-ca.sh ../certs/intermediate/user-ca/ca.csr \
    ../certs/intermediate/user-ca/ca.crt 1825
```

**Trade-offs:**
- ✅ **Simplicity**: No hardware dependencies
- ✅ **Flexibility**: Easy to automate and script
- ✅ **Cost**: No additional hardware required
- ❌ **Security Risk**: Private key stored on filesystem
- ❌ **Backup Complexity**: Must securely backup private key

## 🔄 **Intermediate CA Operations**

### **Create Intermediate CAs:**

```bash
cd CA-mgmt/intermediate

# User CA (for signing user certificates)
./create-user-ca.sh "/CN=CertM3-User-CA" 4096

# Database CA (for PostgreSQL mTLS)
./create-db-ca.sh "/CN=CertM3-Database-CA" 4096

# API CA (for API service certificates)
./create-api-ca.sh "/CN=CertM3-API-CA" 4096
```

### **Renew Intermediate CAs:**

```bash
./renew-ca.sh "../certs/intermediate/user-ca/ca.crt" 1825
```

**Key Rotation Strategy**: When an intermediate CA certificate is about to expire, a new certificate is issued for the same key, extending its validity. This avoids invalidating existing certificates.

## 📊 **Monitoring**

**Check Certificate Expiration:**
```bash
cd CA-mgmt/monitoring
./check-expiration.sh
```

This scans all intermediate CA certificates and warns if any expire within 30 days.

**Recommended Setup:**
- Set up a cron job or monitoring alert to run this script regularly
- Notify administrators of impending expirations
- Run daily in production environments

## 🔧 **Complete Workflow Example**

Here's a typical setup sequence for a production environment:

### **1. Create Root CA (Yubikey)**
```bash
cd CA-mgmt/root
./yubikey-create-root-ca.sh "/CN=CertM3-Root-CA" 3650
```

### **2. Create Intermediate CAs**
```bash
cd ../intermediate
./create-user-ca.sh "/CN=CertM3-User-CA" 4096
./create-db-ca.sh "/CN=CertM3-Database-CA" 4096
./create-api-ca.sh "/CN=CertM3-API-CA" 4096
```

### **3. Sign Intermediate CAs**
```bash
cd ../root
./yubikey-sign-intermediate-ca.sh ../certs/intermediate/user-ca/ca.csr \
    ../certs/intermediate/user-ca/ca.crt 1825
./yubikey-sign-intermediate-ca.sh ../certs/intermediate/database-ca/ca.csr \
    ../certs/intermediate/database-ca/ca.crt 1095
./yubikey-sign-intermediate-ca.sh ../certs/intermediate/api-ca/ca.csr \
    ../certs/intermediate/api-ca/ca.crt 1095
```

### **4. Set Permissions**
```bash
chmod 600 CA-mgmt/certs/**/*.key
chmod 644 CA-mgmt/certs/**/*.crt
```

### **5. Test Monitoring**
```bash
cd CA-mgmt/monitoring
./check-expiration.sh
```

## 🏗️ **Directory Structure**

```
CA-mgmt/
├── root/                      # Root CA operations (Yubikey, manual)
│   ├── yubikey-create-root-ca.sh
│   ├── yubikey-sign-intermediate-ca.sh
│   ├── create-root-ca.sh
│   ├── OSSL-sign-intermediate-ca.sh
│   └── README.md
├── intermediate/              # Intermediate CA operations (manual)
│   ├── create-user-ca.sh
│   ├── create-db-ca.sh
│   ├── create-api-ca.sh
│   └── renew-ca.sh
├── monitoring/                # Certificate monitoring scripts
│   ├── check-expiration.sh
│   └── README.md
├── config/                    # CA configuration and OpenSSL configs
│   ├── openssl-intermediate.conf
│   └── openssl-root.conf
├── certs/                     # Certificates and keys (restricted access)
│   ├── root/
│   ├── intermediate/
│   │   ├── user-ca/
│   │   ├── database-ca/
│   │   └── api-ca/
│   └── services/
│       ├── database/
│       ├── api/
│       └── users/
├── templates/                 # Certificate templates
│   └── quick-start.sh
├── README.md                  # Main documentation
└── INTEGRATION.md             # Integration examples
```

## 🔐 **Key Management Approach**

- **Root CA**: Key is generated and stored on a Yubikey (PIV applet). Used only to sign intermediate CA certificates. All operations are manual and require physical access to the Yubikey.
- **Intermediate CAs**: Keys are generated and stored on the filesystem (with strict permissions). Used to sign service and user certificates. Key rotation is performed by renewing the CA certificate with the same key (Option B: CA Key Rotation), minimizing disruption to already-issued certificates.
- **Service/User Certificates**: Signed by the appropriate intermediate CA. User certificates are managed and automated by the CertM3 signer (Go middleware).

## 🚨 **Security Considerations**

### **Access Control**
- Restrict access to `CA-mgmt/` and especially to `certs/` directories
- Use proper file permissions (600 for keys, 644 for certificates)
- Implement role-based access control for CA operations

### **Backups**
- Back up configuration and public certificates
- Private keys for intermediate CAs should be backed up securely if not easily replaceable
- Root CA private key (on Yubikey) should have a backup Yubikey

### **Audit**
- All CA operations should be logged
- Where possible, require multi-person approval for critical operations
- Maintain audit trails for certificate issuance and revocation

### **Operational Security**
- **Root CA operations** are performed rarely (e.g., every 5-10 years) and require Yubikey and admin intervention
- **Intermediate CA operations** (creation, renewal) are performed manually, typically every 3-5 years
- **Monitoring**: Scripts check for expiring CA certificates and alert admins if any are within 30 days of expiration

## 🔗 **Integration with CertM3**

### **Database mTLS Setup**
The database CA is used to sign PostgreSQL server and client certificates for mutual TLS authentication.

### **CertM3 Signer Integration**
The CertM3 signer (Go middleware) reads the user CA certificate and key to sign user certificates automatically.

### **API Configuration**
The API CA is used for service-to-service authentication and API endpoint security.

## 📚 **Additional Documentation**

- **`CA-mgmt/README.md`**: Overview and directory structure
- **`CA-mgmt/INTEGRATION.md`**: Detailed integration examples with CertM3
- **`CA-mgmt/root/README.md`**: Root CA operations guide
- **`CA-mgmt/monitoring/README.md`**: Monitoring setup

## 🎯 **Recommendations**

- **Production**: Use Yubikey approach for maximum security
- **Development/Testing**: Use OpenSSL approach for simplicity
- **Hybrid**: Use Yubikey for production root CA, OpenSSL for development

## 🎉 **Key Features**

- **🔐 Yubikey Support**: Root CA private key never leaves the hardware
- **🔄 Key Rotation**: Renew certificates without invalidating existing ones
- **📊 Monitoring**: Automated expiration checking
- **🔧 Integration**: Ready for CertM3 middleware and database mTLS
- **📁 Organized Structure**: Separate CAs for users, database, and API
- **🛡️ Production Ready**: Designed with enterprise security practices

The system is designed to be **production-ready** with proper security practices while remaining **developer-friendly** for testing and development! 
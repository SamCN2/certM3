# Root CA Operations

This directory contains scripts for creating and managing the root CA, with support for both Yubikey and traditional OpenSSL approaches.

## Root CA Creation Options

### Option 1: Yubikey Root CA (Recommended for Production)

**Security**: Root CA private key is stored on Yubikey (PIV applet) and never leaves the device.

**Scripts**:
- `yubikey-create-root-ca.sh` - Create root CA on Yubikey
- `yubikey-sign-intermediate-ca.sh` - Sign intermediate CAs using Yubikey

**Prerequisites**:
- Yubikey with PIV applet
- `yubico-piv-tool` installed
- OpenSSL with PKCS#11 support

**Usage**:
```bash
# Create root CA on Yubikey
./yubikey-create-root-ca.sh "/CN=CertM3-Root-CA" 3650

# Sign intermediate CA
./yubikey-sign-intermediate-ca.sh ../certs/intermediate/user-ca/ca.csr \
    ../certs/intermediate/user-ca/ca.crt 1825
```

### Option 2: OpenSSL Root CA (Development/Testing)

**Security**: Root CA private key is stored as a file on the filesystem.

**Scripts**:
- `create-root-ca.sh` - Create root CA using OpenSSL
- `OSSL-sign-intermediate-ca.sh` - Sign intermediate CAs using OpenSSL

**Prerequisites**:
- OpenSSL
- Secure storage for private key

**Usage**:
```bash
# Create root CA
./create-root-ca.sh "/CN=CertM3-Root-CA" 4096 3650

# Sign intermediate CA
./OSSL-sign-intermediate-ca.sh ../certs/intermediate/user-ca/ca.csr \
    ../certs/intermediate/user-ca/ca.crt 1825
```

## Security Considerations

### Yubikey Approach
- ✅ **Highest Security**: Private key never leaves Yubikey
- ✅ **Physical Protection**: Requires physical access to Yubikey
- ✅ **Tamper Resistant**: Hardware security module
- ❌ **Dependency**: Requires Yubikey for all operations
- ❌ **Cost**: Requires Yubikey hardware

### OpenSSL Approach
- ✅ **Simplicity**: No hardware dependencies
- ✅ **Flexibility**: Easy to automate and script
- ✅ **Cost**: No additional hardware required
- ❌ **Security Risk**: Private key stored on filesystem
- ❌ **Backup Complexity**: Must securely backup private key

## Recommendation

- **Production**: Use Yubikey approach for maximum security
- **Development/Testing**: Use OpenSSL approach for simplicity
- **Hybrid**: Use Yubikey for production root CA, OpenSSL for development

## File Locations

- **Yubikey**: Key stored on Yubikey slot 9a, certificate in `../certs/root/ca.crt`
- **OpenSSL**: Key in `../certs/root/ca.key`, certificate in `../certs/root/ca.crt`

## Next Steps

After creating the root CA, proceed to:
1. Create intermediate CAs (see `../intermediate/`)
2. Sign intermediate CAs with the root CA
3. Set up monitoring (see `../monitoring/`)
4. Configure integration (see `../INTEGRATION.md`) 
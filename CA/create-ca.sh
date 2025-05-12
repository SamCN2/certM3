#!/bin/bash

# Copyright (c) 2025 ogt11.com, llc

# Exit on any error
set -e

# Default values
DAYS=3650  # 10 years
CURVE="secp384r1"  # Using secp384r1 for better security and performance
COUNTRY="US"
STATE="MAryland"
LOCALITY="Bethesda"
ORGANIZATION="ogt11.com, llc"
ORG_UNIT="CertM3 PKI Certificate Authority"
COMMON_NAME="ogt11.com Root CA"
EMAIL="certM3@ogt11.com"

# Create directory structure if it doesn't exist
mkdir -p private certs crl newcerts
touch index.txt
if [ ! -f serial ]; then
    echo "01" > serial
fi

# Generate CA private key using EC
openssl ecparam -genkey -name ${CURVE} -out private/ca-key.pem
chmod 400 private/ca-key.pem

# Generate CA certificate
openssl req -new -x509 -days ${DAYS} -key private/ca-key.pem -out certs/ca-cert.pem \
    -subj "/C=${COUNTRY}/ST=${STATE}/L=${LOCALITY}/O=${ORGANIZATION}/OU=${ORG_UNIT}/CN=${COMMON_NAME}/emailAddress=${EMAIL}"
chmod 444 certs/ca-cert.pem

# Create OpenSSL configuration file
cat > ca.cnf << EOL
[ ca ]
default_ca = CA_default

[ CA_default ]
dir               = .
certs             = \$dir/certs
crl_dir           = \$dir/crl
new_certs_dir     = \$dir/newcerts
database          = \$dir/index.txt
serial            = \$dir/serial
RANDFILE          = \$dir/private/.rand

private_key       = \$dir/private/ca-key.pem
certificate       = \$dir/certs/ca-cert.pem

crl               = \$dir/crl/ca.crl
crlnumber         = \$dir/crlnumber
crl_extensions    = crl_ext
default_crl_days  = 30

default_md        = sha384
name_opt         = ca_default
cert_opt         = ca_default
default_days     = 365
preserve         = no
policy           = policy_strict

[ policy_strict ]
countryName             = match
stateOrProvinceName     = match
organizationName        = match
organizationalUnitName  = optional
commonName             = supplied
emailAddress           = optional

[ req ]
default_bits        = 384
default_keyfile     = private/ca-key.pem
distinguished_name  = req_distinguished_name
string_mask        = utf8only
default_md         = sha384
x509_extensions    = v3_ca

[ req_distinguished_name ]
countryName                     = Country Name (2 letter code)
stateOrProvinceName            = State or Province Name
localityName                   = Locality Name
0.organizationName            = Organization Name
organizationalUnitName        = Organizational Unit Name
commonName                    = Common Name
emailAddress                  = Email Address

[ v3_ca ]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints = critical, CA:true
keyUsage = critical, digitalSignature, cRLSign, keyCertSign
extendedKeyUsage = serverAuth, clientAuth, codeSigning, emailProtection

[ v3_intermediate_ca ]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints = critical, CA:true, pathlen:0
keyUsage = critical, digitalSignature, cRLSign, keyCertSign
extendedKeyUsage = serverAuth, clientAuth, codeSigning, emailProtection

[ usr_cert ]
basicConstraints = CA:FALSE
nsCertType = client, email
nsComment = "OpenSSL Generated Client Certificate"
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer
keyUsage = critical, nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth, emailProtection
subjectAltName = email:move
EOL

echo "CA certificate and key have been generated."
echo "Certificate is in certs/ca-cert.pem"
echo "Private key is in private/ca-key.pem"
echo "OpenSSL configuration is in ca.cnf" 

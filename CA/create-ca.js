#!/usr/bin/env node

// Copyright (c) 2025 ogt11.com, llc

const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

// CA Details from create-ca.sh
const caConfig = {
  days: 3650, // 10 years
  attributes: [
    { name: 'countryName', value: 'US' },
    { name: 'stateOrProvinceName', value: 'MAryland' }, // As per create-ca.sh
    { name: 'localityName', value: 'Bethesda' },
    { name: 'organizationName', value: 'ogt11.com, llc' },
    { name: 'organizationalUnitName', value: 'CertM3 PKI Certificate Authority' },
    { name: 'commonName', value: 'ogt11.com Root CA' },
    { name: 'emailAddress', value: 'certM3@ogt11.com' },
  ],
  keyBits: 2048, // RSA key size
  output: {
    certPath: path.resolve(__dirname, 'certs', 'ca-cert.pem'), // Use path.resolve for absolute paths
    keyPath: path.resolve(__dirname, 'private', 'ca-key.pem'), // Use path.resolve for absolute paths
  },
};

async function generateCA() {
  console.log('Generating CA certificate and private key...');

  // Ensure output directories exist
  fs.mkdirSync(path.dirname(caConfig.output.certPath), { recursive: true });
  fs.mkdirSync(path.dirname(caConfig.output.keyPath), { recursive: true });

  // 1. Generate RSA key pair
  console.log(`Generating ${caConfig.keyBits}-bit RSA key pair...`);
  const keys = forge.pki.rsa.generateKeyPair({ bits: caConfig.keyBits, workers: -1 });
  console.log('Key pair generated.');

  // 2. Create self-signed certificate
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01'; // Or generate a random one: forge.util.bytesToHex(forge.random.getBytesSync(16));
  
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setDate(cert.validity.notBefore.getDate() + caConfig.days);

  cert.setSubject(caConfig.attributes);
  cert.setIssuer(caConfig.attributes); // Self-signed

  // 3. Set CA extensions
  cert.setExtensions([
    {
      name: 'basicConstraints',
      critical: true,
      cA: true,
    },
    {
      name: 'keyUsage',
      critical: true,
      keyCertSign: true,
      cRLSign: true,
    },
    {
      name: 'subjectKeyIdentifier' //SKI
    }
  ]);

  // 4. Sign the certificate with its own private key
  console.log('Signing certificate...');
  cert.sign(keys.privateKey, forge.md.sha256.create());
  console.log('Certificate signed.');

  // 5. Convert to PEM format
  const certPem = forge.pki.certificateToPem(cert);
  const keyPem = forge.pki.privateKeyToPem(keys.privateKey); // Unencrypted private key

  // 6. Write to files
  // Function to get a timestamp string for backups
  const getTimestamp = () => {
    const now = new Date();
    const YYYY = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const DD = String(now.getDate()).padStart(2, '0');
    const HH = String(now.getHours()).padStart(2, '0');
    const MIN = String(now.getMinutes()).padStart(2, '0');
    const SS = String(now.getSeconds()).padStart(2, '0');
    return `${YYYY}${MM}${DD}${HH}${MIN}${SS}`;
  };

  // Handle CA certificate file
  if (fs.existsSync(caConfig.output.certPath)) {
    const backupCertPath = `${caConfig.output.certPath}.${getTimestamp()}`;
    try {
      console.log(`Backing up existing CA certificate from ${caConfig.output.certPath} to ${backupCertPath}...`);
      fs.renameSync(caConfig.output.certPath, backupCertPath);
      console.log(`Backed up to ${backupCertPath}`);
    } catch (err) {
      console.warn(`Warning: Could not backup existing CA certificate: ${err.message}. Attempting to overwrite.`);
    }
  }
  fs.writeFileSync(caConfig.output.certPath, certPem);
  console.log(`CA certificate saved to: ${caConfig.output.certPath}`);
  fs.chmodSync(caConfig.output.certPath, 0o444);

  // Handle CA private key file
  if (fs.existsSync(caConfig.output.keyPath)) {
    const backupKeyPath = `${caConfig.output.keyPath}.${getTimestamp()}`; // Regenerate timestamp for key if needed, though usually close
    try {
      console.log(`Backing up existing CA private key from ${caConfig.output.keyPath} to ${backupKeyPath}...`);
      fs.renameSync(caConfig.output.keyPath, backupKeyPath);
      console.log(`Backed up to ${backupKeyPath}`);
    } catch (err) {
      console.warn(`Warning: Could not backup existing CA private key: ${err.message}. Attempting to overwrite.`);
    }
  }
  fs.writeFileSync(caConfig.output.keyPath, keyPem);
  console.log(`CA private key saved to: ${caConfig.output.keyPath}`);
  fs.chmodSync(caConfig.output.keyPath, 0o400);

  console.log('\nCA generation complete.');
  console.log('\nUpdate your environment variables with these paths:');
  console.log(`CA_CERT_PATH="${caConfig.output.certPath}"`);
  console.log(`CA_KEY_PATH="${caConfig.output.keyPath}"`);
}

generateCA().catch(err => {
  console.error('Error generating CA:', err);
  process.exit(1);
});

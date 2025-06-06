// Crypto operations for certificate generation
const crypto = {
  // Generate a key pair using node-forge
  async generateKeyPair() {
    return new Promise((resolve) => {
      const keyPair = forge.pki.rsa.generateKeyPair({ bits: 2048 });
      resolve(keyPair);
    });
  },

  // Generate a CSR using the key pair
  async generateCSR(keyPair, subject) {
    // Create CSR using forge
    const csr = forge.pki.createCertificationRequest();
    csr.setSubject([
      { name: 'commonName', value: subject.commonName },
      { name: 'organizationName', value: subject.organization },
      { name: 'organizationalUnitName', value: subject.organizationalUnit },
      { name: 'localityName', value: subject.locality },
      { name: 'stateOrProvinceName', value: subject.state },
      { name: 'countryName', value: subject.country }
    ]);

    // Set the public key
    csr.publicKey = keyPair.publicKey;

    // Sign the CSR
    csr.sign(keyPair.privateKey);

    // Convert to PEM format
    return forge.pki.certificationRequestToPem(csr);
  },

  // Convert ArrayBuffer to PEM format
  arrayBufferToPem(buffer, type) {
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    const pem = `-----BEGIN ${type}-----\n${base64.match(/.{1,64}/g).join('\n')}\n-----END ${type}-----`;
    return pem;
  },

  // Convert PEM to ArrayBuffer
  pemToArrayBuffer(pem) {
    const base64 = pem.replace(/-----BEGIN .*-----|-----END .*-----|\s/g, '');
    const binary = atob(base64);
    const buffer = new ArrayBuffer(binary.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) {
      view[i] = binary.charCodeAt(i);
    }
    return buffer;
  },

  // Create PKCS#12 bundle
  async createPKCS12(certificate, privateKey, passphrase) {
    // Convert certificate to forge format
    const cert = forge.pki.certificateFromPem(certificate);

    // Create PKCS#12
    const pkcs12 = forge.pkcs12.toPkcs12Asn1(
      privateKey,
      [cert],
      passphrase,
      {
        friendlyName: 'User Certificate',
        localKeyID: '1'
      }
    );

    // Convert to base64
    return forge.util.encode64(forge.asn1.toDer(pkcs12).getBytes());
  }
}; 
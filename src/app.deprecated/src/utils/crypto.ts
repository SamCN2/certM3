import * as forge from 'node-forge';

export interface KeyPair {
  publicKey: forge.pki.PublicKey;
  privateKey: forge.pki.PrivateKey;
}

export interface CSRSubject {
  username: string;
  displayName?: string;
  organization: string;
  organizationalUnit: string;
  locality: string;
  state: string;
  country: string;
  groups: string[];
}

export async function generateKeyPair(): Promise<KeyPair> {
  const keyPair = forge.pki.rsa.generateKeyPair({ bits: 2048 });
  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey
  };
}

export async function generateCSR(keyPair: KeyPair, subject: CSRSubject): Promise<string> {
  const csr = forge.pki.createCertificationRequest();
  csr.publicKey = keyPair.publicKey;
  
  // Set subject attributes
  csr.setSubject([
    { name: 'commonName', value: subject.username },
    { name: 'organizationName', value: subject.organization },
    { name: 'organizationalUnitName', value: subject.organizationalUnit },
    { name: 'localityName', value: subject.locality },
    { name: 'stateOrProvinceName', value: subject.state },
    { name: 'countryName', value: subject.country }
  ]);

  // Add extensions
  const extensions = [{
    name: 'extensionRequest',
    extensions: [
      {
        name: 'subjectAltName',
        altNames: [{
          type: 2, // DNS
          value: subject.username
        }]
      },
      {
        name: 'groups',
        value: JSON.stringify({ groups: subject.groups })
      }
    ]
  }];

  csr.setAttributes(extensions);
  csr.sign(keyPair.privateKey, forge.md.sha256.create());

  return forge.pki.certificationRequestToPem(csr);
} 
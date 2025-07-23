import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import forge from 'node-forge';

// Load group extension OID from config.yaml
const configPath = path.resolve(__dirname, '../src/mw/config.yaml');
const configYaml = fs.readFileSync(configPath, 'utf8');
const config = yaml.load(configYaml);
const GROUP_EXTENSION_OID = config?.signer?.group_extension_oid || '1.3.6.1.4.1.10049.6.5.1.1.1';

// Load the certificate
const certPem = fs.readFileSync(path.resolve(__dirname, 'test-cert.pem'), 'utf8');
const cert = forge.pki.certificateFromPem(certPem);

// Find the group extension
const groupExt = cert.extensions.find((ext: any) => ext.id === GROUP_EXTENSION_OID);
if (groupExt) {
  console.log('Found group extension OID:', GROUP_EXTENSION_OID);
  console.log('Extension value (raw):', groupExt.value);
} else {
  console.error('Group extension OID not found:', GROUP_EXTENSION_OID);
  process.exit(1);
} 
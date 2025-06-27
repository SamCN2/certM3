import { KeyPair, CertificateData } from './types';
import * as forge from 'node-forge';

class CryptoService {
    private static instance: CryptoService;
    private readonly KEY_SIZE = 2048;

    private constructor() {}

    public static getInstance(): CryptoService {
        if (!CryptoService.instance) {
            CryptoService.instance = new CryptoService();
        }
        return CryptoService.instance;
    }

    private validateInput(input: string, name: string): void {
        if (!input || typeof input !== 'string') {
            throw new Error(`${name} must be a non-empty string`);
        }
    }

    public generateKeyPair(): KeyPair {
        try {
            const keys = forge.pki.rsa.generateKeyPair(this.KEY_SIZE);
            return {
                privateKey: forge.pki.privateKeyToPem(keys.privateKey),
                publicKey: forge.pki.publicKeyToPem(keys.publicKey)
            };
        } catch (error: any) {
            throw new Error(`Failed to generate key pair: ${error.message}`);
        }
    }

    public generateCsr(username: string, privateKeyPem: string, groups: string[]): string {
        try {
            this.validateInput(username, 'Username');
            this.validateInput(privateKeyPem, 'Private key');
            
            if (!Array.isArray(groups)) {
                throw new Error('Groups must be an array');
            }

            const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
            const csr = forge.pki.createCertificationRequest();
            
            // Get public key from private key
            const publicKey = forge.pki.setRsaPublicKey(privateKey.n, privateKey.e);
            csr.publicKey = publicKey;
            
            // Set subject
            csr.setSubject([{ name: 'commonName', value: username }]);
            
            // Add username extension
            const usernameOid = '1.3.6.1.4.1.10049.1.2';
            csr.setAttributes([{
                name: 'extensionRequest',
                extensions: [{
                    id: usernameOid,
                    critical: false,
                    value: forge.util.encodeUtf8(username)
                }]
            }]);
            
            // Sign CSR with private key
            csr.sign(privateKey);
            
            // Return PEM-encoded CSR with normalized line endings
            return forge.pki.certificationRequestToPem(csr)
                .replace(/\r\n/g, '\n');
        } catch (error: any) {
            throw new Error(`Failed to generate CSR: ${error.message}`);
        }
    }

    public encryptPrivateKey(privateKeyPem: string, passphrase: string): string {
        try {
            this.validateInput(privateKeyPem, 'Private key');
            this.validateInput(passphrase, 'Passphrase');
            
            const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
            const encryptedKey = forge.pki.encryptRsaPrivateKey(privateKey, passphrase);
            
            // Clear passphrase from memory
            passphrase = '';
            
            return encryptedKey;
        } catch (error: any) {
            // Ensure passphrase is cleared even on error
            passphrase = '';
            throw new Error(`Failed to encrypt private key: ${error.message}`);
        }
    }

    public createAndDownloadPKCS12(certificate: string, encryptedPrivateKey: string, passphrase: string, filename: string): void {
        try {
            this.validateInput(certificate, 'Certificate');
            this.validateInput(encryptedPrivateKey, 'Encrypted private key');
            this.validateInput(passphrase, 'Passphrase');
            this.validateInput(filename, 'Filename');
            
            // Convert PEM strings to forge objects
            const privateKey = forge.pki.privateKeyFromPem(encryptedPrivateKey);
            const cert = forge.pki.certificateFromPem(certificate);
            
            // Create PKCS12 with the encrypted private key
            const p12 = forge.pkcs12.toPkcs12Asn1(
                privateKey,
                [cert],
                passphrase
            );
            
            // Clear passphrase immediately after use
            passphrase = '';
            
            // Convert to DER
            const p12Der = forge.asn1.toDer(p12).getBytes();
            
            // Convert to base64
            const p12b64 = forge.util.encode64(p12Der);
            
            // Create blob and download
            const p12Blob = new Blob(
                [forge.util.decode64(p12b64)],
                { type: 'application/x-pkcs12' }
            );
            
            const url = URL.createObjectURL(p12Blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error: any) {
            // Ensure passphrase is cleared even on error
            passphrase = '';
            throw new Error(`Failed to create and download PKCS12: ${error.message}`);
        }
    }

    public generateCertificateData(username: string, groups: string[]): CertificateData {
        try {
            this.validateInput(username, 'Username');
            
            if (!Array.isArray(groups)) {
                throw new Error('Groups must be an array');
            }

            // Generate key pair
            const { privateKey, publicKey } = this.generateKeyPair();
            
            // Generate CSR
            const csr = this.generateCsr(username, privateKey, groups);
            
            return {
                privateKey,
                publicKey,
                csr
            };
        } catch (error: any) {
            throw new Error(`Failed to generate certificate data: ${error.message}`);
        }
    }
}

// Export singleton instance
export const cryptoService = CryptoService.getInstance(); 
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
export declare function generateKeyPair(): Promise<KeyPair>;
export declare function generateCSR(keyPair: KeyPair, subject: CSRSubject): Promise<string>;

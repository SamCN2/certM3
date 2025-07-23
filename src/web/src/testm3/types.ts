export type CertificateState = 'none' | 'valid' | 'invalid' | 'expired';

export interface CertificateInfo {
    cn: string;
    serial: string;
    expiry: string;
    issuer: string;
    fingerprint: string;
    groups: string[];
    state: CertificateState;
    rawCertificate?: string;
    chain?: string[];
}

export interface RoutingDecision {
    action: 'redirect' | 'proceed' | 'block';
    destination?: string;
    reason: string;
    message: string;
}

export interface GroupInfo {
    name: string;
    displayName: string;
    description?: string;
    permissions?: string[];
} 
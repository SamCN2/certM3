import { CertificateInfo, CertificateState } from '../types';

export class CertificateExtractor {
    static extractFromHeaders(): CertificateInfo | null {
        // Get certificate info from nginx headers
        const cn = this.getHeader('X-Client-CN');
        const verify = this.getHeader('X-Client-Verify');
        const expiry = this.getHeader('X-Client-Expiry');
        const serial = this.getHeader('X-Client-Serial');
        const state = this.getHeader('X-Certificate-State') as CertificateState;

        if (!cn && !verify) {
            return null;
        }

        return {
            cn: cn || 'Unknown',
            serial: serial || 'Unknown',
            expiry: expiry || 'Unknown',
            issuer: 'CertM3 CA', // We'll extract this from the certificate if available
            fingerprint: this.calculateFingerprint(cn || 'Unknown', serial || 'Unknown'),
            groups: this.extractGroupsFromCertificate(),
            state: state || 'none',
            rawCertificate: this.getRawCertificate()
        };
    }

    static getCertificateState(): CertificateState {
        const verify = this.getHeader('X-Client-Verify');
        const expiry = this.getHeader('X-Client-Expiry');
        
        if (!verify || verify === 'NONE') {
            return 'none';
        }
        
        if (verify === 'FAILED') {
            return 'invalid';
        }
        
        if (verify === 'SUCCESS') {
            // Check if certificate is expired
            if (expiry) {
                const expiryDate = new Date(expiry);
                if (expiryDate < new Date()) {
                    return 'expired';
                }
            }
            return 'valid';
        }
        
        return 'none';
    }

    private static getHeader(name: string): string | null {
        // In a real browser environment, we'd get these from response headers
        // For now, we'll simulate this by looking for data attributes or global variables
        const element = document.querySelector(`[data-${name.toLowerCase()}]`);
        if (element) {
            return element.getAttribute(`data-${name.toLowerCase()}`);
        }
        
        // Fallback to checking if nginx set these as global variables
        const globalName = name.replace(/-/g, '_').toLowerCase();
        if (typeof (window as any)[globalName] !== 'undefined') {
            return (window as any)[globalName];
        }
        
        return null;
    }

    private static calculateFingerprint(cn: string, serial: string): string {
        // Simple fingerprint calculation for demo purposes
        // In production, this would be the actual certificate fingerprint
        const input = `${cn}:${serial}`;
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(16).padStart(8, '0');
    }

    private static extractGroupsFromCertificate(): string[] {
        // This would extract groups from the certificate extension
        // For now, we'll simulate this based on the CN or other available data
        const cn = this.getHeader('X-Client-CN');
        
        if (!cn) {
            return [];
        }

        // Simulate group extraction based on CN patterns
        // In production, this would parse the actual certificate extension
        const groups = ['users']; // Default group
        
        if (cn.includes('admin') || cn.includes('Admin')) {
            groups.push('admins');
        }
        
        if (cn.includes('dev') || cn.includes('Dev')) {
            groups.push('developers');
        }
        
        return groups;
    }

    private static getRawCertificate(): string | undefined {
        // In a real implementation, we'd get the raw certificate from nginx
        // For now, return undefined
        return undefined;
    }

    static parseCertificateChain(chainData: string): string[] {
        // Parse certificate chain from PEM format
        const certificates = chainData.split('-----BEGIN CERTIFICATE-----')
            .filter(cert => cert.trim())
            .map(cert => `-----BEGIN CERTIFICATE-----${cert}`);
        
        return certificates;
    }

    static formatDate(dateString: string): string {
        try {
            const date = new Date(dateString);
            return date.toLocaleString();
        } catch {
            return dateString;
        }
    }

    static formatSerial(serial: string): string {
        // Format serial number for display
        if (serial.length > 20) {
            return `${serial.substring(0, 10)}...${serial.substring(serial.length - 10)}`;
        }
        return serial;
    }
} 
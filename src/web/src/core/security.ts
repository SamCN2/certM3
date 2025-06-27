import { apiService } from './api';
import { stateManager } from './state';

class SecurityService {
    private static instance: SecurityService;
    private readonly CSRF_HEADER = 'X-CSRF-Token';
    private readonly JWT_STORAGE_KEY = 'certm3_jwt';

    private constructor() {
        // Initialize security features
        this.setupSecurityHeaders();
    }

    public static getInstance(): SecurityService {
        if (!SecurityService.instance) {
            SecurityService.instance = new SecurityService();
        }
        return SecurityService.instance;
    }

    private setupSecurityHeaders(): void {
        // Add security headers to all requests
        const meta = document.createElement('meta');
        meta.httpEquiv = 'Content-Security-Policy';
        meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'";
        document.head.appendChild(meta);

        // Add CSRF token to all forms
        document.addEventListener('submit', (event) => {
            const form = event.target as HTMLFormElement;
            if (form) {
                const token = this.generateCSRFToken();
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = this.CSRF_HEADER;
                input.value = token;
                form.appendChild(input);
            }
        });
    }

    private generateCSRFToken(): string {
        // Generate a random token
        const array = new Uint32Array(8);
        window.crypto.getRandomValues(array);
        return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
    }

    public getJWT(): string | null {
        return localStorage.getItem(this.JWT_STORAGE_KEY);
    }

    public setJWT(token: string): void {
        if (!token) {
            throw new Error('JWT token cannot be empty');
        }
        localStorage.setItem(this.JWT_STORAGE_KEY, token);
    }

    public clearJWT(): void {
        localStorage.removeItem(this.JWT_STORAGE_KEY);
    }

    public isAuthenticated(): boolean {
        const token = this.getJWT();
        if (!token) return false;

        try {
            // Check if token is expired
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp * 1000 > Date.now();
        } catch {
            return false;
        }
    }

    public async validateSession(): Promise<boolean> {
        if (!this.isAuthenticated()) {
            this.clearJWT();
            stateManager.reset();
            return false;
        }
        return true;
    }

    public getSecurityHeaders(): Record<string, string> {
        return {
            [this.CSRF_HEADER]: this.generateCSRFToken(),
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
        };
    }

    public sanitizeInput(input: string): string {
        // Basic XSS prevention
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    public validateUsername(username: string): boolean {
        // Username validation rules
        return /^[a-zA-Z0-9_-]{3,32}$/.test(username);
    }

    public validateEmail(email: string): boolean {
        // Email validation rules
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    public validateDisplayName(name: string): boolean {
        // Display name validation rules
        return name.length >= 2 && name.length <= 64;
    }

    public validatePassphrase(passphrase: string): boolean {
        // Passphrase validation rules
        return passphrase.length >= 8 && 
               /[A-Z]/.test(passphrase) && 
               /[a-z]/.test(passphrase) && 
               /[0-9]/.test(passphrase);
    }

    public async storeCertificate(certificateData: string, passphrase: string): Promise<void> {
        try {
            // Store certificate data in IndexedDB
            const db = await this.openCertificateDB();
            const tx = db.transaction('certificates', 'readwrite');
            const store = tx.objectStore('certificates');

            // Store the certificate data
            await store.put({
                id: 'current',
                data: certificateData,
                timestamp: new Date().toISOString()
            });

            // Store the passphrase in memory (not persisted)
            this.currentPassphrase = passphrase;

            // Clear the passphrase from the parameter
            passphrase = '';
        } catch (error: any) {
            throw new Error(`Failed to store certificate: ${error.message}`);
        }
    }

    private async openCertificateDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('certm3_certificates', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains('certificates')) {
                    db.createObjectStore('certificates', { keyPath: 'id' });
                }
            };
        });
    }

    private currentPassphrase: string | null = null;
}

// Export singleton instance
export const securityService = SecurityService.getInstance(); 
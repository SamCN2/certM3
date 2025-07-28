import { CertificateExtractor } from '../testm3/utils/CertificateExtractor';

interface CertificateInfo {
    cn: string;
    verify: string;
    expiry: string;
    serial: string;
    state: string;
}

interface RenewalFormData {
    username: string;
    email: string;
    displayName: string;
    passphrase: string;
    confirmPassphrase: string;
    groups: string[];
}

class CertificateRenewalApp {
    private certificateInfo: CertificateInfo | null = null;
    private formData: RenewalFormData = {
        username: '',
        email: '',
        displayName: '',
        passphrase: '',
        confirmPassphrase: '',
        groups: []
    };

    constructor() {
        this.initialize();
    }

    private async initialize(): Promise<void> {
        try {
            // Extract certificate info from nginx headers
            this.certificateInfo = this.extractCertificateInfo();
            
            if (!this.certificateInfo || this.certificateInfo.state !== 'expired') {
                this.showError('This page is only for expired certificates. Please visit the main CertM3 application.');
                return;
            }

            // Pre-fill form with existing user data
            this.prefillFormData();
            
            // Render the application
            this.render();
            
            // Add event listeners
            this.setupEventListeners();
            
        } catch (error) {
            console.error('Failed to initialize renewal app:', error);
            this.showError('Failed to load certificate information');
        }
    }

    private extractCertificateInfo(): CertificateInfo | null {
        const certData = document.getElementById('certificate-data');
        if (!certData) return null;

        return {
            cn: certData.getAttribute('data-x-client-cn') || '',
            verify: certData.getAttribute('data-x-client-verify') || '',
            expiry: certData.getAttribute('data-x-client-expiry') || '',
            serial: certData.getAttribute('data-x-client-serial') || '',
            state: certData.getAttribute('data-x-certificate-state') || ''
        };
    }

    private prefillFormData(): void {
        if (!this.certificateInfo) return;

        // Extract username from CN (assuming format like "username@domain.com" or just "username")
        const cn = this.certificateInfo.cn;
        const username = cn.includes('@') ? cn.split('@')[0] : cn;
        
        // Pre-fill with existing data
        this.formData.username = username;
        this.formData.email = `${username}@ogt11.com`; // Default email pattern
        this.formData.displayName = username.charAt(0).toUpperCase() + username.slice(1); // Capitalize first letter
        this.formData.groups = ['users', username]; // Default groups: users + username-based group
    }

    private render(): void {
        const app = document.getElementById('renewal-app');
        if (!app) {
            console.error('Could not find #renewal-app element');
            return;
        }

        app.innerHTML = `
            <div class="renewal-container">
                <header class="renewal-header">
                    <h1>🔄 Certificate Renewal</h1>
                    <p class="subtitle">Your certificate has expired. Let's get you a new one!</p>
                </header>
                
                <div class="renewal-card">
                    <div class="expired-cert-info">
                        <h3>⚠️ Expired Certificate Details</h3>
                        <div class="cert-details">
                            <div class="cert-detail-item">
                                <label>Username:</label>
                                <span class="value">${this.certificateInfo?.cn || 'Unknown'}</span>
                            </div>
                            <div class="cert-detail-item">
                                <label>Expired:</label>
                                <span class="value">${this.certificateInfo?.expiry || 'Unknown'}</span>
                            </div>
                            <div class="cert-detail-item">
                                <label>Serial:</label>
                                <span class="value">${this.certificateInfo?.serial || 'Unknown'}</span>
                            </div>
                        </div>
                    </div>

                    <div class="renewal-form">
                        <h3>🔄 Renew Your Certificate</h3>
                        <p style="margin-bottom: 20px; color: #6c757d;">
                            We've pre-filled your information from your existing certificate. 
                            You can update any details if needed.
                        </p>

                        <div id="message-container"></div>

                        <form id="renewal-form">
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="username">Username:</label>
                                    <input type="text" id="username" class="form-control" 
                                           value="${this.formData.username}" required>
                                </div>
                                <div class="form-group">
                                    <label for="email">Email:</label>
                                    <input type="email" id="email" class="form-control" 
                                           value="${this.formData.email}" required>
                                </div>
                            </div>

                            <div class="form-group">
                                <label for="displayName">Display Name:</label>
                                <input type="text" id="displayName" class="form-control" 
                                       value="${this.formData.displayName}" required>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label for="passphrase">New Passphrase:</label>
                                    <input type="password" id="passphrase" class="form-control" 
                                           placeholder="Enter a strong passphrase" required>
                                    <small style="color: #6c757d; margin-top: 5px; display: block;">
                                        Choose a strong passphrase for your new certificate
                                    </small>
                                </div>
                                <div class="form-group">
                                    <label for="confirmPassphrase">Confirm Passphrase:</label>
                                    <input type="password" id="confirmPassphrase" class="form-control" 
                                           placeholder="Confirm your passphrase" required>
                                </div>
                            </div>

                            <div class="form-group">
                                <label>Groups (pre-selected):</label>
                                <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border: 1px solid #dee2e6;">
                                    <div style="margin-bottom: 10px;">
                                        <input type="checkbox" id="group-users" checked disabled>
                                        <label for="group-users" style="margin-left: 8px; color: #6c757d;">users (required)</label>
                                    </div>
                                    <div>
                                        <input type="checkbox" id="group-self" checked disabled>
                                        <label for="group-self" style="margin-left: 8px; color: #6c757d;">${this.formData.username} (your personal group)</label>
                                    </div>
                                </div>
                                <small style="color: #6c757d; margin-top: 5px; display: block;">
                                    These groups are automatically assigned based on your existing certificate
                                </small>
                            </div>

                            <div style="margin-top: 30px;">
                                <button type="submit" id="renew-button" class="btn btn-primary">
                                    🔄 Renew Certificate
                                </button>
                                <button type="button" id="cancel-button" class="btn btn-secondary" style="margin-left: 10px;">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <div id="certificate-result" style="display: none;"></div>
            </div>
        `;
    }

    private setupEventListeners(): void {
        // Form submission
        const form = document.getElementById('renewal-form') as HTMLFormElement;
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRenewal();
            });
        }

        // Cancel button
        const cancelButton = document.getElementById('cancel-button');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                window.location.href = '/certm3/';
            });
        }

        // Passphrase validation
        const passphraseInput = document.getElementById('passphrase') as HTMLInputElement;
        const confirmInput = document.getElementById('confirmPassphrase') as HTMLInputElement;
        
        if (passphraseInput && confirmInput) {
            confirmInput.addEventListener('input', () => {
                this.validatePassphrases();
            });
        }
    }

    private validatePassphrases(): boolean {
        const passphraseInput = document.getElementById('passphrase') as HTMLInputElement;
        const confirmInput = document.getElementById('confirmPassphrase') as HTMLInputElement;
        
        if (!passphraseInput || !confirmInput) return false;

        const passphrase = passphraseInput.value;
        const confirm = confirmInput.value;

        if (passphrase !== confirm) {
            confirmInput.setCustomValidity('Passphrases do not match');
            return false;
        } else {
            confirmInput.setCustomValidity('');
        }

        if (passphrase.length < 8) {
            passphraseInput.setCustomValidity('Passphrase must be at least 8 characters');
            return false;
        } else {
            passphraseInput.setCustomValidity('');
        }

        return true;
    }

    private async handleRenewal(): Promise<void> {
        if (!this.validatePassphrases()) {
            return;
        }

        // Collect form data
        const username = (document.getElementById('username') as HTMLInputElement)?.value || '';
        const email = (document.getElementById('email') as HTMLInputElement)?.value || '';
        const displayName = (document.getElementById('displayName') as HTMLInputElement)?.value || '';
        const passphrase = (document.getElementById('passphrase') as HTMLInputElement)?.value || '';

        if (!username || !email || !displayName || !passphrase) {
            this.showMessage('Please fill in all required fields.', 'error');
            return;
        }

        // Show loading state
        const renewButton = document.getElementById('renew-button') as HTMLButtonElement;
        if (renewButton) {
            renewButton.disabled = true;
            renewButton.innerHTML = '<span class="spinner"></span> Renewing...';
        }

        try {
            // Step 1: Check if username is available (should be, since it's their existing username)
            const usernameCheck = await this.checkUsername(username);
            if (!usernameCheck.available) {
                this.showMessage('Username is already taken. Please contact support.', 'error');
                return;
            }

            // Step 2: Create certificate request
            const requestResult = await this.createCertificateRequest({
                username,
                email,
                displayName,
                passphrase
            });

            if (!requestResult.success) {
                this.showMessage(`Failed to create certificate request: ${requestResult.error}`, 'error');
                return;
            }

            // Step 3: Validate and issue certificate
            const validationResult = await this.validateAndIssueCertificate(requestResult.requestId, passphrase);

            if (!validationResult.success) {
                this.showMessage(`Failed to issue certificate: ${validationResult.error}`, 'error');
                return;
            }

            // Success!
            this.showSuccess(validationResult.certificate);

        } catch (error) {
            console.error('Renewal failed:', error);
            this.showMessage('An unexpected error occurred. Please try again.', 'error');
        } finally {
            // Reset button
            if (renewButton) {
                renewButton.disabled = false;
                renewButton.innerHTML = '🔄 Renew Certificate';
            }
        }
    }

    private async checkUsername(username: string): Promise<{ available: boolean }> {
        try {
            const response = await fetch('/app/check-username/' + encodeURIComponent(username), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                return { available: true };
            } else {
                return { available: false };
            }
        } catch (error) {
            console.error('Username check failed:', error);
            return { available: false };
        }
    }

    private async createCertificateRequest(data: {
        username: string;
        email: string;
        displayName: string;
        passphrase: string;
    }): Promise<{ success: boolean; requestId?: string; error?: string }> {
        try {
            const response = await fetch('/app/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: data.username,
                    email: data.email,
                    displayName: data.displayName
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                return { success: false, error: errorText };
            }

            const result = await response.json();
            return { success: true, requestId: result.id };
        } catch (error) {
            console.error('Certificate request failed:', error);
            return { success: false, error: 'Network error' };
        }
    }

    private async validateAndIssueCertificate(requestId: string, passphrase: string): Promise<{
        success: boolean;
        certificate?: string;
        error?: string;
    }> {
        try {
            const response = await fetch('/app/validate-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    requestId: requestId,
                    passphrase: passphrase
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                return { success: false, error: errorText };
            }

            const result = await response.json();
            return { success: true, certificate: result.certificate };
        } catch (error) {
            console.error('Certificate validation failed:', error);
            return { success: false, error: 'Network error' };
        }
    }

    private showSuccess(certificate: string): void {
        const resultDiv = document.getElementById('certificate-result');
        if (resultDiv) {
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `
                <div class="renewal-card">
                    <div class="message success">
                        <h3>🎉 Certificate Renewed Successfully!</h3>
                        <p>Your new certificate has been issued. Please download and install it.</p>
                    </div>
                    
                    <div class="certificate-display">
                        <h4>Your New Certificate:</h4>
                        <div class="certificate-data">${this.escapeHtml(certificate)}</div>
                    </div>
                    
                    <div style="margin-top: 20px;">
                        <button class="btn btn-success" onclick="window.location.href='/certm3/'">
                            🏠 Go to CertM3 Home
                        </button>
                        <button class="btn btn-secondary" onclick="window.print()" style="margin-left: 10px;">
                            🖨️ Print Certificate
                        </button>
                    </div>
                </div>
            `;
        }

        // Scroll to result
        resultDiv?.scrollIntoView({ behavior: 'smooth' });
    }

    private showMessage(message: string, type: 'success' | 'error' | 'info'): void {
        const container = document.getElementById('message-container');
        if (container) {
            container.innerHTML = `<div class="message ${type}">${message}</div>`;
        }
    }

    private showError(message: string): void {
        const app = document.getElementById('renewal-app');
        if (app) {
            app.innerHTML = `
                <div class="renewal-container">
                    <div class="renewal-card">
                        <div class="message error">
                            <h3>❌ Error</h3>
                            <p>${message}</p>
                            <button class="btn btn-primary" onclick="window.location.href='/certm3/'">
                                Go to CertM3 Home
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CertificateRenewalApp();
});
// Add forge type declaration
declare const forge: any;

console.log('Index app starting...');

class IndexApp {
    private static instance: IndexApp;
    private debounceTimers: { [key: string]: number } = {};
    private fieldValidity = {
        username: false,
        email: false,
        displayName: false
    };
    private requestId: string | null = null;
    private jwt: string | null = null;
    private username: string | null = null;

    private constructor() {
        console.log('IndexApp constructor called');
        this.initializeApp();
    }

    public static getInstance(): IndexApp {
        if (!IndexApp.instance) {
            IndexApp.instance = new IndexApp();
        }
        return IndexApp.instance;
    }

    private initializeApp(): void {
        console.log('Initializing index app');
        this.setupEventListeners();
        this.showInitialView();
    }

    private setupEventListeners(): void {
        console.log('Setting up event listeners');
        
        // Initial request form
        const requestForm = document.getElementById('requestForm') as HTMLFormElement;
        if (requestForm) {
            // Username validation
            const usernameInput = document.getElementById('username') as HTMLInputElement;
            if (usernameInput) {
                usernameInput.addEventListener('input', (event: Event) => {
                    const input = event.target as HTMLInputElement;
                    const username = input.value.trim();
                    
                    clearTimeout(this.debounceTimers.username);
                    const feedback = document.getElementById('username-feedback');
                    if (feedback) {
                        feedback.textContent = '';
                        feedback.className = '';
                    }
                    this.fieldValidity.username = false;
                    this.updateSubmitButton();
                    
                    if (username.length < 3) {
                        return;
                    }

                    this.debounceTimers.username = window.setTimeout(async () => {
                        try {
                            console.log('Checking username:', username);
                            const response = await fetch(`/app/check-username/${encodeURIComponent(username)}`);
                            const data = await response.json();
                            console.log('Response:', data);
                            
                            if (feedback) {
                                if (data.available) {
                                    feedback.textContent = 'Username is available';
                                    feedback.className = 'success';
                                    this.fieldValidity.username = true;
                                } else {
                                    feedback.textContent = 'Username is taken';
                                    feedback.className = 'error';
                                    this.fieldValidity.username = false;
                                }
                            }
                            this.updateSubmitButton();
                        } catch (error) {
                            console.error('Error checking username:', error);
                            if (feedback) {
                                feedback.textContent = 'Error checking username';
                                feedback.className = 'error';
                            }
                            this.fieldValidity.username = false;
                            this.updateSubmitButton();
                        }
                    }, 300);
                });
            }

            // Email validation
            const emailInput = document.getElementById('email') as HTMLInputElement;
            if (emailInput) {
                emailInput.addEventListener('input', (event: Event) => {
                    const input = event.target as HTMLInputElement;
                    const email = input.value.trim();
                    clearTimeout(this.debounceTimers.email);
                    const feedback = document.getElementById('email-feedback');
                    if (feedback) {
                        feedback.textContent = '';
                        feedback.className = '';
                    }
                    this.fieldValidity.email = false;
                    this.updateSubmitButton();

                    if (!email) {
                        return;
                    }

                    this.debounceTimers.email = window.setTimeout(() => {
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (feedback) {
                            if (emailRegex.test(email)) {
                                feedback.textContent = 'Valid email format';
                                feedback.className = 'success';
                                this.fieldValidity.email = true;
                            } else {
                                feedback.textContent = 'Please enter a valid email address';
                                feedback.className = 'error';
                                this.fieldValidity.email = false;
                            }
                        }
                        this.updateSubmitButton();
                    }, 300);
                });
            }

            // Display name validation
            const displayNameInput = document.getElementById('displayName') as HTMLInputElement;
            if (displayNameInput) {
                displayNameInput.addEventListener('input', (event: Event) => {
                    const input = event.target as HTMLInputElement;
                    const displayName = input.value.trim();
                    clearTimeout(this.debounceTimers.displayName);
                    const feedback = document.getElementById('displayName-feedback');
                    if (feedback) {
                        feedback.textContent = '';
                        feedback.className = '';
                    }
                    this.fieldValidity.displayName = false;
                    this.updateSubmitButton();

                    if (!displayName) {
                        return;
                    }

                    this.debounceTimers.displayName = window.setTimeout(() => {
                        if (feedback) {
                            if (displayName.length < 2) {
                                feedback.textContent = 'Display name must be at least 2 characters';
                                feedback.className = 'error';
                                this.fieldValidity.displayName = false;
                            } else if (displayName.length > 64) {
                                feedback.textContent = 'Display name must be less than 64 characters';
                                feedback.className = 'error';
                                this.fieldValidity.displayName = false;
                            } else {
                                feedback.textContent = 'Display name looks good';
                                feedback.className = 'success';
                                this.fieldValidity.displayName = true;
                            }
                        }
                        this.updateSubmitButton();
                    }, 300);
                });
            }

            // Form submission
            const submitButton = document.getElementById('submitButton') as HTMLButtonElement;
            if (submitButton) {
                submitButton.addEventListener('click', async () => {
                    const username = usernameInput.value.trim();
                    const email = emailInput.value.trim();
                    const displayName = displayNameInput.value.trim();

                    submitButton.disabled = true;
                    const submitFeedback = document.getElementById('submit-feedback');
                    if (submitFeedback) {
                        submitFeedback.textContent = 'Submitting request...';
                        submitFeedback.className = '';
                    }

                    try {
                        console.log('Submitting request with data:', { username, email, displayName });
                        const response = await fetch('/app/initiate-request', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                username,
                                email,
                                displayName
                            })
                        });
                        const data = await response.json();
                        console.log('Response:', data);

                        if (data && data.id) {
                            // Store request ID and username for validation
                            this.requestId = data.id;
                            this.username = username;
                            
                            if (submitFeedback) {
                                submitFeedback.textContent = 'Request submitted successfully! Check your email for validation instructions.';
                                submitFeedback.className = 'success';
                            }
                            
                            // Clear form
                            usernameInput.value = '';
                            emailInput.value = '';
                            displayNameInput.value = '';
                            this.fieldValidity.username = false;
                            this.fieldValidity.email = false;
                            this.fieldValidity.displayName = false;
                            this.updateSubmitButton();

                            // Show validation form
                            this.showValidationView();
                        } else {
                            throw new Error('Unexpected response format from server');
                        }
                    } catch (error) {
                        console.error('Error submitting request:', error);
                        if (submitFeedback) {
                            submitFeedback.textContent = error instanceof Error ? error.message : 'Error submitting request';
                            submitFeedback.className = 'error';
                        }
                        submitButton.disabled = false;
                    }
                });
            }
        }

        // Validation form
        const validationForm = document.getElementById('validationForm');
        if (validationForm) {
            const validateButton = document.getElementById('validateButton') as HTMLButtonElement;
            if (validateButton) {
                validateButton.addEventListener('click', async () => {
                    const challengeInput = document.getElementById('challengeToken') as HTMLInputElement;
                    const challengeToken = challengeInput.value.trim();
                    const validateFeedback = document.getElementById('validate-feedback');

                    if (!challengeToken) {
                        if (validateFeedback) {
                            validateFeedback.textContent = 'Please enter the validation code';
                            validateFeedback.className = 'error';
                        }
                        return;
                    }

                    validateButton.disabled = true;
                    if (validateFeedback) {
                        validateFeedback.textContent = 'Validating email...';
                        validateFeedback.className = '';
                    }

                    try {
                        const response = await fetch('/app/validate-email', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                requestId: this.requestId,
                                challengeToken
                            })
                        });
                        const data = await response.json();

                        if (data && data.token) {
                            if (validateFeedback) {
                                validateFeedback.textContent = 'Email validated successfully!';
                                validateFeedback.className = 'success';
                            }
                            // Store JWT for next step
                            this.jwt = data.token;
                            // Load available groups and show CSR view
                            await this.loadGroupsAndShowCsrView();
                        } else {
                            throw new Error('Unexpected response format from server');
                        }
                    } catch (error) {
                        console.error('Error validating email:', error);
                        if (validateFeedback) {
                            validateFeedback.textContent = error instanceof Error ? error.message : 'Error validating email';
                            validateFeedback.className = 'error';
                        }
                        validateButton.disabled = false;
                    }
                });
            }
        }

        // CSR form
        const csrForm = document.getElementById('csrForm');
        if (csrForm) {
            // Passphrase confirmation validation
            const passphraseInput = document.getElementById('passphrase') as HTMLInputElement;
            const confirmPassphraseInput = document.getElementById('confirmPassphrase') as HTMLInputElement;
            
            if (passphraseInput && confirmPassphraseInput) {
                // Enable confirm field when passphrase is entered
                passphraseInput.addEventListener('input', () => {
                    const passphrase = passphraseInput.value.trim();
                    confirmPassphraseInput.disabled = passphrase.length === 0;
                    if (passphrase.length === 0) {
                        confirmPassphraseInput.value = '';
                    }
                    
                    // Update entropy meter
                    this.updateEntropyMeter(passphrase);
                });
                
                // Validate passphrase confirmation
                confirmPassphraseInput.addEventListener('input', () => {
                    const passphrase = passphraseInput.value.trim();
                    const confirmPassphrase = confirmPassphraseInput.value.trim();
                    
                    if (confirmPassphrase.length > 0 && passphrase !== confirmPassphrase) {
                        confirmPassphraseInput.setCustomValidity('Passphrases do not match');
                    } else {
                        confirmPassphraseInput.setCustomValidity('');
                    }
                });
            }
            
            const generateCertBtn = document.getElementById('generateCertBtn') as HTMLButtonElement;
            if (generateCertBtn) {
                generateCertBtn.addEventListener('click', async () => {
                    const passphraseInput = document.getElementById('passphrase') as HTMLInputElement;
                    const confirmPassphraseInput = document.getElementById('confirmPassphrase') as HTMLInputElement;
                    let passphrase = passphraseInput.value.trim();
                    const confirmPassphrase = confirmPassphraseInput.value.trim();
                    const groupSelect = document.getElementById('groupSelect') as HTMLSelectElement;
                    const selectedGroups = Array.from(groupSelect.selectedOptions).map(option => option.value);
                    const generateFeedback = document.getElementById('generate-feedback');

                    if (!passphrase) {
                        if (generateFeedback) {
                            generateFeedback.textContent = 'Please enter a passphrase';
                            generateFeedback.className = 'error';
                        }
                        return;
                    }

                    if (passphrase !== confirmPassphrase) {
                        if (generateFeedback) {
                            generateFeedback.textContent = 'Passphrases do not match';
                            generateFeedback.className = 'error';
                        }
                        return;
                    }

                    if (selectedGroups.length === 0) {
                        if (generateFeedback) {
                            generateFeedback.textContent = 'Please select at least one group';
                            generateFeedback.className = 'error';
                        }
                        return;
                    }

                    // Disable button and show loading state
                    generateCertBtn.disabled = true;
                    generateCertBtn.textContent = 'Generating...';
                    if (generateFeedback) {
                        generateFeedback.textContent = 'Generating certificate... Please wait.';
                        generateFeedback.className = '';
                    }

                    try {
                        // Generate key pair
                        const keys = forge.pki.rsa.generateKeyPair(2048);
                        
                        // Create CSR
                        const csr = forge.pki.createCertificationRequest();
                        csr.publicKey = keys.publicKey;
                        csr.setSubject([{ name: 'commonName', value: this.username }]);
                        
                        // Add custom username extension
                        const usernameOid = '1.3.6.1.4.1.10049.1.2';
                        const usernameExt = {
                            id: usernameOid,
                            critical: false,
                            value: forge.util.encodeUtf8(this.username)
                        };
                        
                        // Add extension
                        csr.setAttributes([{
                            name: 'extensionRequest',
                            extensions: [usernameExt]
                        }]);
                        
                        // Sign CSR
                        csr.sign(keys.privateKey);
                        
                        // Convert to PEM
                        const pemCsr = forge.pki.certificationRequestToPem(csr)
                            .replace(/\r\n/g, '\n');

                        // Submit CSR
                        const response = await fetch('/app/submit-csr', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${this.jwt}`
                            },
                            body: JSON.stringify({
                                csr: pemCsr
                            })
                        });
                        const data = await response.json();

                        if (data && data.certificate) {
                            // Parse the certificate
                            let cert = forge.pki.certificateFromPem(data.certificate);
                            
                            // Create PKCS#12 package
                            let p12Asn1 = forge.pkcs12.toPkcs12Asn1(
                                keys.privateKey,
                                [cert],
                                passphrase,
                                {
                                    friendlyName: this.username,
                                    algorithm: '3des'
                                }
                            );
                            
                            // Convert to binary
                            let p12Der = forge.asn1.toDer(p12Asn1).getBytes();
                            
                            // Convert to base64
                            let p12b64 = forge.util.encode64(p12Der);
                            
                            // Create download link
                            const downloadLink = document.createElement('a');
                            downloadLink.href = 'data:application/x-pkcs12;base64,' + p12b64;
                            downloadLink.download = `${this.username}.p12`;
                            downloadLink.className = 'btn btn-primary';
                            downloadLink.textContent = 'Download Certificate Package';
                            
                            // Add click handler to clean up sensitive data after download
                            downloadLink.addEventListener('click', () => {
                                // Clear sensitive data
                                keys.privateKey = null;
                                keys.publicKey = null;
                                cert = null;
                                p12Asn1 = null;
                                p12Der = null;
                                p12b64 = null;
                                
                                // Clear passphrase from memory
                                passphrase = '';
                                
                                // Clear forge buffers
                                forge.util.clearBuffer(p12Der);
                                
                                // Force garbage collection hints
                                if (window.gc) {
                                    window.gc();
                                }
                                
                                // Remove download link after use
                                setTimeout(() => {
                                    const container = document.getElementById('download-container');
                                    if (container && container.contains(downloadLink)) {
                                        container.removeChild(downloadLink);
                                    }
                                }, 1000);
                            });
                            
                            // Add download link to container
                            const downloadContainer = document.getElementById('download-container');
                            if (downloadContainer) {
                                downloadContainer.appendChild(downloadLink);
                            }

                            // Show certificate details view
                            this.showCertificateView(cert);
                        } else {
                            throw new Error('Unexpected response format from server');
                        }
                    } catch (error) {
                        console.error('Error generating certificate:', error);
                        if (generateFeedback) {
                            generateFeedback.textContent = error instanceof Error ? error.message : 'Error generating certificate';
                            generateFeedback.className = 'error';
                        }
                        generateCertBtn.disabled = false;
                        generateCertBtn.textContent = 'Generate Certificate'; // Reset button text
                    }
                });
            }
        }
    }

    private updateSubmitButton(): void {
        const submitButton = document.getElementById('submitButton') as HTMLButtonElement;
        if (submitButton) {
            const allValid = Object.values(this.fieldValidity).every(valid => valid);
            submitButton.disabled = !allValid;
            console.log('Submit button state updated:', !allValid ? 'disabled' : 'enabled');
        }
    }

    private showInitialView(): void {
        // Hide all views
        document.querySelectorAll('.view').forEach(el => {
            (el as HTMLElement).classList.remove('active');
        });
        // Show the initial request form
        const requestForm = document.getElementById('requestForm');
        if (requestForm) {
            requestForm.classList.add('active');
        }
        console.log('Initial view shown');
    }

    private showValidationView(): void {
        // Hide all views
        document.querySelectorAll('.view').forEach(el => {
            (el as HTMLElement).classList.remove('active');
        });
        // Show the validation form
        const validationForm = document.getElementById('validationForm');
        if (validationForm) {
            validationForm.classList.add('active');
        }
        console.log('Validation view shown');
    }

    private showCsrView(): void {
        console.log('Attempting to show CSR view');
        // Hide all views
        document.querySelectorAll('.view').forEach(el => {
            (el as HTMLElement).classList.remove('active');
        });
        // Show the CSR form
        const csrForm = document.getElementById('csrForm');
        if (csrForm) {
            csrForm.classList.add('active');
            console.log('CSR view shown successfully');
        } else {
            console.error('CSR form element not found');
        }
    }

    private async loadGroupsAndShowCsrView(): Promise<void> {
        if (!this.jwt) {
            console.error('No JWT available for groups request');
            return;
        }

        if (!this.username) {
            console.error('No username available for groups request');
            return;
        }

        try {
            const response = await fetch(`/app/groups/${this.username}`, {
                headers: {
                    'Authorization': `Bearer ${this.jwt}`
                }
            });
            const groups = await response.json();

            // Populate group select
            const groupSelect = document.getElementById('groupSelect') as HTMLSelectElement;
            if (groupSelect) {
                groupSelect.innerHTML = groups.map((group: string) => 
                    `<option value="${group}">${group}</option>`
                ).join('');
                
                // Pre-select "users" and the username-based group (user's "self" group)
                Array.from(groupSelect.options).forEach(option => {
                    if (option.value === 'users' || option.value === this.username) {
                        option.selected = true;
                    }
                });
            }

            // Show CSR view
            this.showCsrView();
        } catch (error) {
            console.error('Error loading groups:', error);
            // Show error in validation form
            const validateFeedback = document.getElementById('validate-feedback');
            if (validateFeedback) {
                validateFeedback.textContent = 'Error loading groups. Please try again.';
                validateFeedback.className = 'error';
            }
        }
    }

    private showCertificateView(cert: any): void {
        // Hide all views
        document.querySelectorAll('.view').forEach(el => {
            (el as HTMLElement).classList.remove('active');
        });

        // Show certificate details view
        const certDetailsView = document.getElementById('certificate-details');
        if (certDetailsView) {
            certDetailsView.classList.add('active');

            // Populate basic certificate information
            const subject = cert.subject.attributes.find((attr: any) => attr.name === 'commonName')?.value || 'N/A';
            const issuer = cert.issuer.attributes.find((attr: any) => attr.name === 'commonName')?.value || 'N/A';
            const validFrom = new Date(cert.validity.notBefore).toLocaleString();
            const validTo = new Date(cert.validity.notAfter).toLocaleString();
            const serial = cert.serialNumber;

            // Update DOM elements
            document.getElementById('cert-subject')!.textContent = subject;
            document.getElementById('cert-issuer')!.textContent = issuer;
            document.getElementById('cert-valid-from')!.textContent = validFrom;
            document.getElementById('cert-valid-to')!.textContent = validTo;
            document.getElementById('cert-serial')!.textContent = serial;

            // Set up full details toggle
            const toggleButton = document.getElementById('toggle-details');
            const fullDetails = document.querySelector('.full-details') as HTMLElement;
            if (toggleButton && fullDetails) {
                toggleButton.addEventListener('click', () => {
                    const isHidden = fullDetails.style.display === 'none';
                    fullDetails.style.display = isHidden ? 'block' : 'none';
                    toggleButton.textContent = isHidden ? 'Hide Full Details' : 'Show Full Details';
                    
                    if (isHidden) {
                        // Only populate full details when first shown
                        const fullDetailsElement = document.getElementById('cert-full-details');
                        if (fullDetailsElement) {
                            fullDetailsElement.innerHTML = `<code>${JSON.stringify(cert, null, 2)}</code>`;
                        }
                    }
                });
            }
        }
    }

    private calculatePasswordStrength(password: string): { score: number; message: string; class: string } {
        if (password.length === 0) {
            return { score: 0, message: "Enter a passphrase", class: "" };
        }

        let score = 0;
        let feedback = [];

        // Length rewards (encouraging longer passwords)
        if (password.length >= 8) {
            score += 20;
            feedback.push("Good length");
        } else if (password.length >= 6) {
            score += 10;
            feedback.push("Getting longer");
        }

        // Character variety rewards (without requiring specific types)
        const hasLower = /[a-z]/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        const hasDigit = /\d/.test(password);
        const hasSpecial = /[^a-zA-Z0-9]/.test(password);

        let varietyBonus = 0;
        if (hasLower) varietyBonus += 5;
        if (hasUpper) varietyBonus += 5;
        if (hasDigit) varietyBonus += 5;
        if (hasSpecial) varietyBonus += 5;

        score += varietyBonus;
        if (varietyBonus >= 15) {
            feedback.push("Great variety!");
        } else if (varietyBonus >= 10) {
            feedback.push("Good variety");
        }

        // Uniqueness reward (encouraging non-repeating patterns)
        const uniqueChars = new Set(password).size;
        const uniquenessRatio = uniqueChars / password.length;
        if (uniquenessRatio > 0.7) {
            score += 10;
            feedback.push("Unique characters");
        }

        // Entropy-based reward (encouraging randomness without requiring it)
        let entropy = 0;
        const charSet = new Set(password);
        if (charSet.size > 0) {
            entropy = Math.log2(Math.pow(charSet.size, password.length));
            if (entropy > 50) {
                score += 15;
                feedback.push("High entropy!");
            } else if (entropy > 30) {
                score += 10;
                feedback.push("Good entropy");
            }
        }

        // Final scoring and encouraging messages
        if (score >= 60) {
            return { 
                score: Math.min(score, 100), 
                message: "Excellent! " + feedback.join(", "), 
                class: "strong" 
            };
        } else if (score >= 40) {
            return { 
                score: Math.min(score, 100), 
                message: "Good! " + feedback.join(", "), 
                class: "medium" 
            };
        } else if (score >= 20) {
            return { 
                score: Math.min(score, 100), 
                message: "Getting better! " + feedback.join(", "), 
                class: "weak" 
            };
        } else {
            return { 
                score: Math.min(score, 100), 
                message: "Keep going! " + feedback.join(", "), 
                class: "weak" 
            };
        }
    }

    private updateEntropyMeter(password: string): void {
        const entropyBar = document.querySelector('.entropy-bar') as HTMLElement;
        const entropyValue = document.getElementById('entropyValue');
        
        if (!entropyBar || !entropyValue) return;
        
        const strength = this.calculatePasswordStrength(password);
        
        // Update the bar width and color
        entropyBar.style.width = `${strength.score}%`;
        entropyBar.className = `entropy-bar ${strength.class}`;
        
        // Update the text
        entropyValue.textContent = strength.score.toString();
        
        // Update the entropy text with encouraging message
        const entropyText = document.querySelector('.entropy-text');
        if (entropyText) {
            entropyText.textContent = strength.message;
        }
    }
}

// Initialize the application
console.log('Starting index application...');
IndexApp.getInstance(); 
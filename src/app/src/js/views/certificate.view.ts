import { AppService } from '../services/app-service';
import { generateKeyPair, generateCSR } from '../utils/crypto';

export class CertificateView {
  private appService: AppService;
  private form: HTMLFormElement | null;
  private passwordInput: HTMLInputElement | null;
  private errorMessage: HTMLElement | null;
  private validationMessage: HTMLElement | null;

  constructor() {
    this.appService = AppService.getInstance();
    this.form = document.querySelector('#certificate-form');
    this.passwordInput = document.querySelector('input[name="password"]');
    this.errorMessage = document.querySelector('.error.message');
    this.validationMessage = document.querySelector('.validation.message');

    this.initialize();
  }

  private initialize() {
    // Check for required URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const requestId = urlParams.get('requestId');

    if (!token || !requestId) {
      this.showError('Missing token or requestId');
      return;
    }

    // Set up form submission
    if (this.form) {
      this.form.addEventListener('submit', this.handleSubmit.bind(this));
    }

    // Set up password validation
    if (this.passwordInput) {
      this.passwordInput.addEventListener('input', this.validatePassword.bind(this));
    }
  }

  private validatePassword() {
    if (!this.passwordInput || !this.validationMessage) return;

    const password = this.passwordInput.value;
    if (password.length < 8) {
      this.validationMessage.textContent = 'Password must be at least 8 characters';
      this.validationMessage.style.display = 'block';
    } else {
      this.validationMessage.style.display = 'none';
    }
  }

  private async handleSubmit(event: Event) {
    event.preventDefault();
    if (!this.form || !this.passwordInput) return;

    const password = this.passwordInput.value;
    if (password.length < 8) {
      this.showError('Password must be at least 8 characters');
      return;
    }

    try {
      // Generate key pair and CSR
      const keyPair = await generateKeyPair();
      const csr = await generateCSR(keyPair);

      // Get requestId from URL
      const urlParams = new URLSearchParams(window.location.search);
      const requestId = urlParams.get('requestId');

      if (!requestId) {
        this.showError('Missing requestId');
        return;
      }

      // Submit for signing
      const response = await this.appService.signCertificate({
        requestId,
        csr,
        password
      });

      if (response.success && response.data) {
        // Create PKCS#12 bundle
        const p12 = await this.createPKCS12Bundle(
          response.data.certificate,
          response.data.privateKey,
          password
        );

        // Trigger download
        this.downloadCertificate(p12, 'certificate.p12');
      } else {
        this.showError(response.error || 'Failed to sign certificate');
      }
    } catch (error) {
      console.error('Error processing certificate:', error);
      this.showError('Failed to process certificate');
    }
  }

  private showError(message: string) {
    if (this.errorMessage) {
      this.errorMessage.textContent = message;
      this.errorMessage.style.display = 'block';
    }
  }

  private async createPKCS12Bundle(certificate: string, privateKey: string, password: string): Promise<ArrayBuffer> {
    // This is a placeholder - in a real implementation, you would use a library like forge
    // to create the PKCS#12 bundle
    return new ArrayBuffer(0);
  }

  private downloadCertificate(data: ArrayBuffer, filename: string) {
    const blob = new Blob([data], { type: 'application/x-pkcs12' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
} 
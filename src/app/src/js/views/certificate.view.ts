import { BaseView } from './base.view';
import { ApiService } from '../services/api.service';

export class CertificateView extends BaseView {
  private apiService: ApiService;

  constructor() {
    super('certificate');
    this.apiService = ApiService.getInstance();
    this.render();
  }

  protected render(): void {
    const html = `
      <div class="ui segment">
        <h2 class="ui header">Generate Certificate</h2>
        <form class="ui form" id="generate-certificate-form">
          <div class="field">
            <label>Request ID</label>
            <input type="text" name="requestId" required>
          </div>
          <button class="ui primary button" type="submit">
            <span class="button-text">Generate Certificate</span>
            <div class="ui active inline loader" style="display: none;"></div>
          </button>
        </form>
        <div class="ui error message" style="display: none;"></div>
        <div class="ui success message" style="display: none;"></div>
        <div class="ui segment certificate-result" style="display: none;">
          <h3 class="ui header">Certificate Details</h3>
          <div class="ui list">
            <div class="item">
              <div class="header">Certificate ID</div>
              <div class="description certificate-id"></div>
            </div>
            <div class="item">
              <div class="header">Valid Until</div>
              <div class="description valid-until"></div>
            </div>
          </div>
          <div class="ui divider"></div>
          <button class="ui secondary button download-certificate">
            <i class="download icon"></i> Download Certificate
          </button>
        </div>
      </div>
    `;
    this.setContent(html);
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const form = this.element.querySelector('#generate-certificate-form') as HTMLFormElement;
    form.addEventListener('submit', this.handleSubmit.bind(this));

    const downloadButton = this.element.querySelector('.download-certificate') as HTMLButtonElement;
    downloadButton.addEventListener('click', this.handleDownload.bind(this));
  }

  private async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const requestId = formData.get('requestId') as string;
    
    this.setLoading(true);
    this.hideMessages();
    this.hideCertificateResult();

    try {
      const response = await this.apiService.generateCertificate(requestId);

      if (response.success) {
        this.showSuccess('Certificate generated successfully!');
        this.showCertificateResult(response.data);
        form.reset();
      } else {
        this.showError(response.error || 'Failed to generate certificate');
      }
    } catch (error) {
      this.showError('An unexpected error occurred');
      console.error('Error generating certificate:', error);
    } finally {
      this.setLoading(false);
    }
  }

  private async handleDownload(): Promise<void> {
    // TODO: Implement certificate download
    console.log('Download certificate');
  }

  private showCertificateResult(data: any): void {
    const resultDiv = this.element.querySelector('.certificate-result') as HTMLElement;
    const certificateId = resultDiv.querySelector('.certificate-id') as HTMLElement;
    const validUntil = resultDiv.querySelector('.valid-until') as HTMLElement;

    certificateId.textContent = data.certificateId;
    validUntil.textContent = new Date(data.validUntil).toLocaleString();
    resultDiv.style.display = 'block';
  }

  private hideCertificateResult(): void {
    const resultDiv = this.element.querySelector('.certificate-result') as HTMLElement;
    resultDiv.style.display = 'none';
  }

  private setLoading(isLoading: boolean): void {
    const button = this.element.querySelector('button[type="submit"]') as HTMLButtonElement;
    const loader = button.querySelector('.loader') as HTMLElement;
    const buttonText = button.querySelector('.button-text') as HTMLElement;
    
    button.disabled = isLoading;
    loader.style.display = isLoading ? 'inline-block' : 'none';
    buttonText.style.display = isLoading ? 'none' : 'inline-block';
  }

  private showError(message: string): void {
    const errorMessage = this.element.querySelector('.error.message') as HTMLElement;
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
  }

  private showSuccess(message: string): void {
    const successMessage = this.element.querySelector('.success.message') as HTMLElement;
    successMessage.textContent = message;
    successMessage.style.display = 'block';
  }

  private hideMessages(): void {
    const messages = this.element.querySelectorAll('.message');
    messages.forEach(msg => (msg as HTMLElement).style.display = 'none');
  }
} 
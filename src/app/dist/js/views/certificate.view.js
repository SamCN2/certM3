"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CertificateView = void 0;
const base_view_1 = require("./base.view");
const api_service_1 = require("../services/api.service");
class CertificateView extends base_view_1.BaseView {
    constructor() {
        super('certificate');
        this.apiService = api_service_1.ApiService.getInstance();
        this.render();
    }
    render() {
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
    setupEventListeners() {
        const form = this.element.querySelector('#generate-certificate-form');
        form.addEventListener('submit', this.handleSubmit.bind(this));
        const downloadButton = this.element.querySelector('.download-certificate');
        downloadButton.addEventListener('click', this.handleDownload.bind(this));
    }
    async handleSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const requestId = formData.get('requestId');
        this.setLoading(true);
        this.hideMessages();
        this.hideCertificateResult();
        try {
            const response = await this.apiService.generateCertificate(requestId);
            if (response.success) {
                this.showSuccess('Certificate generated successfully!');
                this.showCertificateResult(response.data);
                form.reset();
            }
            else {
                this.showError(response.error || 'Failed to generate certificate');
            }
        }
        catch (error) {
            this.showError('An unexpected error occurred');
            console.error('Error generating certificate:', error);
        }
        finally {
            this.setLoading(false);
        }
    }
    async handleDownload() {
        // TODO: Implement certificate download
        console.log('Download certificate');
    }
    showCertificateResult(data) {
        const resultDiv = this.element.querySelector('.certificate-result');
        const certificateId = resultDiv.querySelector('.certificate-id');
        const validUntil = resultDiv.querySelector('.valid-until');
        certificateId.textContent = data.certificateId;
        validUntil.textContent = new Date(data.validUntil).toLocaleString();
        resultDiv.style.display = 'block';
    }
    hideCertificateResult() {
        const resultDiv = this.element.querySelector('.certificate-result');
        resultDiv.style.display = 'none';
    }
    setLoading(isLoading) {
        const button = this.element.querySelector('button[type="submit"]');
        const loader = button.querySelector('.loader');
        const buttonText = button.querySelector('.button-text');
        button.disabled = isLoading;
        loader.style.display = isLoading ? 'inline-block' : 'none';
        buttonText.style.display = isLoading ? 'none' : 'inline-block';
    }
    showError(message) {
        const errorMessage = this.element.querySelector('.error.message');
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
    showSuccess(message) {
        const successMessage = this.element.querySelector('.success.message');
        successMessage.textContent = message;
        successMessage.style.display = 'block';
    }
    hideMessages() {
        const messages = this.element.querySelectorAll('.message');
        messages.forEach(msg => msg.style.display = 'none');
    }
}
exports.CertificateView = CertificateView;

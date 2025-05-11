"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidateView = void 0;
const base_view_1 = require("./base.view");
const api_service_1 = require("../services/api.service");
class ValidateView extends base_view_1.BaseView {
    constructor() {
        super('validate');
        this.apiService = api_service_1.ApiService.getInstance();
        this.render();
    }
    render() {
        const html = `
      <div class="ui segment">
        <h2 class="ui header">Validate Email</h2>
        <form class="ui form" id="validate-email-form">
          <div class="field">
            <label>Email Address</label>
            <input type="email" name="email" required>
          </div>
          <button class="ui primary button" type="submit">
            <span class="button-text">Validate Email</span>
            <div class="ui active inline loader" style="display: none;"></div>
          </button>
        </form>
        <div class="ui error message" style="display: none;"></div>
        <div class="ui success message" style="display: none;"></div>
      </div>
    `;
        this.setContent(html);
        this.setupEventListeners();
    }
    setupEventListeners() {
        const form = this.element.querySelector('#validate-email-form');
        form.addEventListener('submit', this.handleSubmit.bind(this));
    }
    async handleSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const email = formData.get('email');
        this.setLoading(true);
        this.hideMessages();
        try {
            const response = await this.apiService.validateEmail(email);
            if (response.success) {
                this.showSuccess('Email validated successfully!');
                form.reset();
            }
            else {
                this.showError(response.error || 'Failed to validate email');
            }
        }
        catch (error) {
            this.showError('An unexpected error occurred');
            console.error('Error validating email:', error);
        }
        finally {
            this.setLoading(false);
        }
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
exports.ValidateView = ValidateView;

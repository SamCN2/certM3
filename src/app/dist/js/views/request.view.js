"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestView = void 0;
const base_view_1 = require("./base.view");
const api_service_1 = require("../services/api.service");
class RequestView extends base_view_1.BaseView {
    constructor() {
        super('request');
        this.usernameTimeout = null;
        this.apiService = api_service_1.ApiService.getInstance();
        this.render();
    }
    render() {
        const html = `
      <div class="ui segment">
        <h2 class="ui header">Request User Account</h2>
        <div class="ui info message">
          <div class="header">Before You Begin</div>
          <p>You'll need to provide:</p>
          <ul class="list">
            <li>A unique username</li>
            <li>A valid email address</li>
            <li>Your display name</li>
          </ul>
          <p>After submitting, you'll receive an email with a validation link.</p>
        </div>
        <form class="ui form" id="user-request-form">
          <div class="field">
            <label>Username</label>
            <div class="ui input">
              <input type="text" name="username" required 
                     pattern="[a-zA-Z0-9_-]{3,32}" 
                     title="3-32 characters, letters, numbers, underscore, or hyphen">
            </div>
            <div class="ui pointing label username-validation" style="display: none;"></div>
          </div>
          <div class="field">
            <label>Email Address</label>
            <div class="ui input">
              <input type="email" name="email" required>
            </div>
          </div>
          <div class="field">
            <label>Display Name</label>
            <div class="ui input">
              <input type="text" name="displayName" required 
                     minlength="2" maxlength="64"
                     title="2-64 characters">
            </div>
          </div>
          <button class="ui primary button" type="submit">
            <span class="button-text">Request Account</span>
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
        const form = this.element.querySelector('#user-request-form');
        const usernameInput = form.querySelector('input[name="username"]');
        form.addEventListener('submit', this.handleSubmit.bind(this));
        usernameInput.addEventListener('input', this.handleUsernameInput.bind(this));
    }
    async handleUsernameInput(event) {
        const input = event.target;
        const validationLabel = this.element.querySelector('.username-validation');
        // Clear any existing timeout
        if (this.usernameTimeout) {
            window.clearTimeout(this.usernameTimeout);
        }
        // Set a new timeout for validation
        this.usernameTimeout = window.setTimeout(async () => {
            const username = input.value.trim();
            if (!username) {
                validationLabel.style.display = 'none';
                return;
            }
            // Validate format first
            if (!/^[a-zA-Z0-9_-]{3,32}$/.test(username)) {
                validationLabel.className = 'ui pointing red label username-validation';
                validationLabel.textContent = 'Username must be 3-32 characters, letters, numbers, underscore, or hyphen';
                validationLabel.style.display = 'block';
                return;
            }
            try {
                const response = await this.apiService.validateUsername(username);
                if (response.success && response.data?.available) {
                    validationLabel.className = 'ui pointing green label username-validation';
                    validationLabel.textContent = 'Username is available';
                }
                else {
                    validationLabel.className = 'ui pointing red label username-validation';
                    validationLabel.textContent = 'Username is not available';
                }
                validationLabel.style.display = 'block';
            }
            catch (error) {
                console.error('Error validating username:', error);
                validationLabel.style.display = 'none';
            }
        }, 500); // Debounce for 500ms
    }
    async handleSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        this.setLoading(true);
        this.hideMessages();
        try {
            const response = await this.apiService.createRequest({
                username: data.username,
                email: data.email,
                displayName: data.displayName
            });
            if (response.success) {
                this.showSuccess('Request submitted successfully! Please check your email for the validation link.');
                form.reset();
                // Redirect to validation page after a short delay
                setTimeout(() => {
                    window.location.href = '/app/validate';
                }, 2000);
            }
            else {
                this.showError(response.error || 'Failed to submit request');
            }
        }
        catch (error) {
            this.showError('An unexpected error occurred');
            console.error('Error submitting form:', error);
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
exports.RequestView = RequestView;

/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/js/services/api.service.ts":
/*!****************************************!*\
  !*** ./src/js/services/api.service.ts ***!
  \****************************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ApiService = void 0;
class ApiService {
    constructor() {
        this.baseUrl = 'http://urp.ogt11.com/api';
        // Constructor logic if needed
    }
    static getInstance() {
        if (!ApiService.instance) {
            ApiService.instance = new ApiService();
        }
        return ApiService.instance;
    }
    async createRequest(request) {
        try {
            const response = await fetch(`${this.baseUrl}/requests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });
            const data = await response.json();
            return {
                success: response.ok,
                data: response.ok ? data : undefined,
                error: response.ok ? undefined : data.message,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
    async validateUsername(username) {
        try {
            const response = await fetch(`${this.baseUrl}/validate/username`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username }),
            });
            const data = await response.json();
            return {
                success: response.ok,
                data: response.ok ? data : undefined,
                error: response.ok ? undefined : data.message,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
    async validateEmail(email) {
        try {
            const response = await fetch(`${this.baseUrl}/validate/email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });
            const data = await response.json();
            return {
                success: response.ok,
                data: response.ok ? data : undefined,
                error: response.ok ? undefined : data.message,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
    async generateCertificate(requestId) {
        try {
            const response = await fetch(`${this.baseUrl}/certificates/generate/${requestId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            return {
                success: response.ok,
                data: response.ok ? data : undefined,
                error: response.ok ? undefined : data.message,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
}
exports.ApiService = ApiService;


/***/ }),

/***/ "./src/js/views/base.view.ts":
/*!***********************************!*\
  !*** ./src/js/views/base.view.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BaseView = void 0;
class BaseView {
    constructor(viewName) {
        this.template = '';
        this.element = document.createElement('div');
        this.element.id = `view-${viewName}`;
        this.element.className = 'view';
        document.getElementById('app-content')?.appendChild(this.element);
    }
    show() {
        this.element.style.display = 'block';
        this.onShow();
    }
    hide() {
        this.element.style.display = 'none';
        this.onHide();
    }
    onShow() { }
    onHide() { }
    setContent(html) {
        this.element.innerHTML = html;
    }
}
exports.BaseView = BaseView;


/***/ }),

/***/ "./src/js/views/certificate.view.ts":
/*!******************************************!*\
  !*** ./src/js/views/certificate.view.ts ***!
  \******************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CertificateView = void 0;
const base_view_1 = __webpack_require__(/*! ./base.view */ "./src/js/views/base.view.ts");
const api_service_1 = __webpack_require__(/*! ../services/api.service */ "./src/js/services/api.service.ts");
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


/***/ }),

/***/ "./src/js/views/request.view.ts":
/*!**************************************!*\
  !*** ./src/js/views/request.view.ts ***!
  \**************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RequestView = void 0;
const base_view_1 = __webpack_require__(/*! ./base.view */ "./src/js/views/base.view.ts");
const api_service_1 = __webpack_require__(/*! ../services/api.service */ "./src/js/services/api.service.ts");
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


/***/ }),

/***/ "./src/js/views/validate.view.ts":
/*!***************************************!*\
  !*** ./src/js/views/validate.view.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ValidateView = void 0;
const base_view_1 = __webpack_require__(/*! ./base.view */ "./src/js/views/base.view.ts");
const api_service_1 = __webpack_require__(/*! ../services/api.service */ "./src/js/services/api.service.ts");
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


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;
/*!***********************!*\
  !*** ./src/js/app.ts ***!
  \***********************/

Object.defineProperty(exports, "__esModule", ({ value: true }));
const request_view_1 = __webpack_require__(/*! ./views/request.view */ "./src/js/views/request.view.ts");
const validate_view_1 = __webpack_require__(/*! ./views/validate.view */ "./src/js/views/validate.view.ts");
const certificate_view_1 = __webpack_require__(/*! ./views/certificate.view */ "./src/js/views/certificate.view.ts");
const api_service_1 = __webpack_require__(/*! ./services/api.service */ "./src/js/services/api.service.ts");
class CertM3App {
    constructor() {
        this.currentView = null;
        this.views = {};
        this.apiService = api_service_1.ApiService.getInstance();
        this.setupNavigation();
        this.handleRoute(window.location.pathname);
    }
    setupNavigation() {
        window.addEventListener('popstate', (e) => {
            this.handleRoute(window.location.pathname);
        });
        // Handle link clicks
        document.addEventListener('click', (e) => {
            const target = e.target;
            const link = target.closest('a');
            if (link && link.getAttribute('href')?.startsWith('/app/')) {
                e.preventDefault();
                this.navigateTo(link.getAttribute('href'));
            }
        });
    }
    handleRoute(path) {
        const viewName = path.split('/')[2] || 'request';
        this.showView(viewName);
    }
    navigateTo(path) {
        window.history.pushState({}, '', path);
        this.handleRoute(path);
    }
    showView(viewName) {
        if (this.currentView) {
            this.currentView.hide();
        }
        if (!this.views[viewName]) {
            this.views[viewName] = this.createView(viewName);
        }
        this.views[viewName].show();
        this.currentView = this.views[viewName];
    }
    createView(viewName) {
        switch (viewName) {
            case 'request':
                return new request_view_1.RequestView();
            case 'validate':
                return new validate_view_1.ValidateView();
            case 'certificate':
                return new certificate_view_1.CertificateView();
            default:
                return new request_view_1.RequestView(); // Default to request view
        }
    }
}
// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new CertM3App();
});

})();

/******/ })()
;
//# sourceMappingURL=app.js.map
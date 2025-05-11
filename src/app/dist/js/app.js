"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request_view_1 = require("./views/request.view");
const validate_view_1 = require("./views/validate.view");
const certificate_view_1 = require("./views/certificate.view");
const api_service_1 = require("./services/api.service");
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

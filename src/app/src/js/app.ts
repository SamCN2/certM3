import { BaseView } from './views/base.view';
import { RequestView } from './views/request.view';
import { ValidateView } from './views/validate.view';
import { CertificateView } from './views/certificate.view';
import { ApiService } from './services/api.service';

class CertM3App {
  private currentView: BaseView | null = null;
  private views: { [key: string]: BaseView } = {};
  private apiService: ApiService;

  constructor() {
    this.apiService = ApiService.getInstance();
    this.setupNavigation();
    this.handleRoute(window.location.pathname);
  }

  private setupNavigation(): void {
    window.addEventListener('popstate', (e) => {
      this.handleRoute(window.location.pathname);
    });

    // Handle link clicks
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      if (link && link.getAttribute('href')?.startsWith('/app/')) {
        e.preventDefault();
        this.navigateTo(link.getAttribute('href')!);
      }
    });
  }

  private handleRoute(path: string): void {
    const viewName = path.split('/')[2] || 'request';
    this.showView(viewName);
  }

  private navigateTo(path: string): void {
    window.history.pushState({}, '', path);
    this.handleRoute(path);
  }

  private showView(viewName: string): void {
    if (this.currentView) {
      this.currentView.hide();
    }

    if (!this.views[viewName]) {
      this.views[viewName] = this.createView(viewName);
    }

    this.views[viewName].show();
    this.currentView = this.views[viewName];
  }

  private createView(viewName: string): BaseView {
    switch (viewName) {
      case 'request':
        return new RequestView();
      case 'validate':
        return new ValidateView();
      case 'certificate':
        return new CertificateView();
      default:
        return new RequestView(); // Default to request view
    }
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  new CertM3App();
}); 
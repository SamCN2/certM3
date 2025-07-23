import { CertificateInfo, CertificateState } from './types';
import { CertificateDisplay } from './components/CertificateDisplay';
import { RoutingGuide } from './components/RoutingGuide';
import { CertificateExtractor } from './utils/CertificateExtractor';

class TestM3App {
    private certificateInfo: CertificateInfo | null = null;
    private certificateState: CertificateState = 'none';

    constructor() {
        this.initialize();
    }

    private async initialize(): Promise<void> {
        try {
            // Extract certificate info from nginx headers
            this.certificateInfo = CertificateExtractor.extractFromHeaders();
            this.certificateState = CertificateExtractor.getCertificateState();
            
            // Render the application
            this.render();
            
            // Add event listeners
            this.setupEventListeners();
            
        } catch (error) {
            console.error('Failed to initialize TestM3 app:', error);
            this.showError('Failed to load certificate information');
        }
    }

    private render(): void {
        const app = document.getElementById('testm3-app');
        if (!app) {
            console.error('Could not find #testm3-app element');
            return;
        }

        app.innerHTML = `
            <div class="testm3-container">
                <header class="testm3-header">
                    <h1>CertM3 Certificate Test Page</h1>
                    <p class="subtitle">Certificate Information and Routing Guide</p>
                </header>
                
                <main class="testm3-main">
                    <div class="certificate-section">
                        <h2>Certificate Information</h2>
                        <div id="certificate-display"></div>
                    </div>
                    
                    <div class="routing-section">
                        <h2>Routing Guide</h2>
                        <div id="routing-guide"></div>
                    </div>
                    
                    <div class="actions-section">
                        <h2>Actions</h2>
                        <div id="action-buttons"></div>
                    </div>
                </main>
            </div>
        `;

        // Render components
        const certDisplay = new CertificateDisplay();
        certDisplay.render(document.getElementById('certificate-display')!, this.certificateInfo, this.certificateState);

        const routingGuide = new RoutingGuide();
        routingGuide.render(document.getElementById('routing-guide')!, this.certificateState, this.certificateInfo);

        this.renderActionButtons();
    }

    private renderActionButtons(): void {
        const actionButtons = document.getElementById('action-buttons');
        if (!actionButtons) return;

        const buttons = [];

        // Always show the main certm3 app
        buttons.push(`
            <button class="btn btn-primary" onclick="window.location.href='/certm3/'">
                Go to CertM3 App
            </button>
        `);

        // Show different buttons based on certificate state
        switch (this.certificateState) {
            case 'none':
                buttons.push(`
                    <button class="btn btn-secondary" onclick="window.location.href='/certm3/index.html'">
                        Get Certificate
                    </button>
                `);
                break;
            case 'invalid':
                buttons.push(`
                    <button class="btn btn-warning" onclick="window.location.href='/certm3/error.html'">
                        Certificate Error
                    </button>
                `);
                break;
            case 'valid':
                buttons.push(`
                    <button class="btn btn-success" onclick="window.location.href='/certm3/dashboard.html'">
                        Dashboard
                    </button>
                `);
                break;
        }

        // Show admin button if user has admin groups
        if (this.certificateInfo?.groups?.includes('admins')) {
            buttons.push(`
                <button class="btn btn-admin" onclick="window.location.href='/admin/'">
                    Admin Panel
                </button>
            `);
        }

        actionButtons.innerHTML = buttons.join('');
    }

    private setupEventListeners(): void {
        // Add any interactive event listeners here
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('copy-btn')) {
                this.copyToClipboard(target.dataset.value || '');
            }
        });
    }

    private copyToClipboard(text: string): void {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Copied to clipboard!');
        }).catch(() => {
            this.showToast('Failed to copy to clipboard');
        });
    }

    private showToast(message: string): void {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    private showError(message: string): void {
        const app = document.getElementById('testm3-app');
        if (app) {
            app.innerHTML = `
                <div class="error-container">
                    <h2>Error</h2>
                    <p>${message}</p>
                    <button onclick="location.reload()">Retry</button>
                </div>
            `;
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TestM3App();
}); 
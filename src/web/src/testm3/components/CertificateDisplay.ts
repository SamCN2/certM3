import { CertificateInfo, CertificateState } from '../types';
import { CertificateExtractor } from '../utils/CertificateExtractor';

export class CertificateDisplay {
    render(container: HTMLElement, certInfo: CertificateInfo | null, state: CertificateState): void {
        if (!certInfo) {
            container.innerHTML = this.renderNoCertificate();
            return;
        }

        container.innerHTML = `
            <div class="certificate-card">
                <div class="certificate-header">
                    <div class="certificate-status ${state}">
                        <span class="status-icon">${this.getStatusIcon(state)}</span>
                        <span class="status-text">${this.getStatusText(state)}</span>
                    </div>
                </div>
                
                <div class="certificate-details">
                    ${this.renderCertificateDetails(certInfo)}
                </div>
                
                ${this.renderCertificateChain(certInfo)}
                ${this.renderGroups(certInfo)}
                ${this.renderRawCertificate(certInfo)}
            </div>
        `;
    }

    private renderNoCertificate(): string {
        return `
            <div class="no-certificate">
                <div class="no-cert-icon">🔒</div>
                <h3>No Certificate Detected</h3>
                <p>No client certificate was provided or detected by the server.</p>
                <div class="certificate-status none">
                    <span class="status-icon">⚠️</span>
                    <span class="status-text">No Certificate</span>
                </div>
            </div>
        `;
    }

    private renderCertificateDetails(certInfo: CertificateInfo): string {
        return `
            <div class="cert-detail-section">
                <h4>Certificate Details</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Common Name (CN):</label>
                        <span class="value">${certInfo.cn}</span>
                        <button class="copy-btn" data-value="${certInfo.cn}" title="Copy to clipboard">📋</button>
                    </div>
                    
                    <div class="detail-item">
                        <label>Serial Number:</label>
                        <span class="value">${CertificateExtractor.formatSerial(certInfo.serial)}</span>
                        <button class="copy-btn" data-value="${certInfo.serial}" title="Copy to clipboard">📋</button>
                    </div>
                    
                    <div class="detail-item">
                        <label>Issuer:</label>
                        <span class="value">${certInfo.issuer}</span>
                    </div>
                    
                    <div class="detail-item">
                        <label>Valid Until:</label>
                        <span class="value ${this.isExpired(certInfo.expiry) ? 'expired' : ''}">
                            ${CertificateExtractor.formatDate(certInfo.expiry)}
                        </span>
                    </div>
                    
                    <div class="detail-item">
                        <label>Fingerprint:</label>
                        <span class="value">${certInfo.fingerprint}</span>
                        <button class="copy-btn" data-value="${certInfo.fingerprint}" title="Copy to clipboard">📋</button>
                    </div>
                </div>
            </div>
        `;
    }

    private renderCertificateChain(certInfo: CertificateInfo): string {
        if (!certInfo.chain || certInfo.chain.length === 0) {
            return '';
        }

        return `
            <div class="cert-chain-section">
                <h4>Certificate Chain</h4>
                <div class="chain-list">
                    ${certInfo.chain.map((cert, index) => `
                        <div class="chain-item">
                            <div class="chain-number">${index + 1}</div>
                            <div class="chain-details">
                                <div class="chain-subject">${this.extractSubjectFromCert(cert)}</div>
                                <div class="chain-issuer">Issued by: ${this.extractIssuerFromCert(cert)}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    private renderGroups(certInfo: CertificateInfo): string {
        if (!certInfo.groups || certInfo.groups.length === 0) {
            return `
                <div class="groups-section">
                    <h4>Groups</h4>
                    <p class="no-groups">No groups found in certificate</p>
                </div>
            `;
        }

        return `
            <div class="groups-section">
                <h4>Groups</h4>
                <div class="groups-list">
                    ${certInfo.groups.map(group => `
                        <div class="group-item">
                            <span class="group-name">${group}</span>
                            <span class="group-badge">${this.getGroupBadge(group)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    private renderRawCertificate(certInfo: CertificateInfo): string {
        if (!certInfo.rawCertificate) {
            return '';
        }

        return `
            <div class="raw-cert-section">
                <h4>Raw Certificate</h4>
                <details>
                    <summary>View PEM Certificate</summary>
                    <pre class="raw-cert-data">${certInfo.rawCertificate}</pre>
                    <button class="copy-btn" data-value="${certInfo.rawCertificate}" title="Copy to clipboard">📋 Copy Certificate</button>
                </details>
            </div>
        `;
    }

    private getStatusIcon(state: CertificateState): string {
        switch (state) {
            case 'valid': return '✅';
            case 'invalid': return '❌';
            case 'expired': return '⏰';
            case 'none': return '🔒';
            default: return '❓';
        }
    }

    private getStatusText(state: CertificateState): string {
        switch (state) {
            case 'valid': return 'Valid Certificate';
            case 'invalid': return 'Invalid Certificate';
            case 'expired': return 'Expired Certificate';
            case 'none': return 'No Certificate';
            default: return 'Unknown Status';
        }
    }

    private isExpired(expiry: string): boolean {
        try {
            const expiryDate = new Date(expiry);
            return expiryDate < new Date();
        } catch {
            return false;
        }
    }

    private extractSubjectFromCert(cert: string): string {
        // Simple extraction for demo - in production would use proper ASN.1 parsing
        const match = cert.match(/Subject: ([^\n]+)/);
        return match ? match[1] : 'Unknown Subject';
    }

    private extractIssuerFromCert(cert: string): string {
        // Simple extraction for demo - in production would use proper ASN.1 parsing
        const match = cert.match(/Issuer: ([^\n]+)/);
        return match ? match[1] : 'Unknown Issuer';
    }

    private getGroupBadge(group: string): string {
        switch (group.toLowerCase()) {
            case 'admins': return '👑';
            case 'users': return '👤';
            case 'developers': return '💻';
            default: return '🏷️';
        }
    }
} 
import { CertificateInfo, CertificateState, RoutingDecision } from '../types';

export class RoutingGuide {
    render(container: HTMLElement, state: CertificateState, certInfo: CertificateInfo | null): void {
        const routingDecision = this.getRoutingDecision(state, certInfo);
        
        container.innerHTML = `
            <div class="routing-card">
                <div class="routing-header">
                    <h4>Routing Decision</h4>
                    <div class="routing-status ${routingDecision.action}">
                        <span class="status-icon">${this.getActionIcon(routingDecision.action)}</span>
                        <span class="status-text">${routingDecision.action.toUpperCase()}</span>
                    </div>
                </div>
                
                <div class="routing-details">
                    <div class="routing-reason">
                        <strong>Reason:</strong> ${routingDecision.reason}
                    </div>
                    <div class="routing-message">
                        ${routingDecision.message}
                    </div>
                    
                    ${routingDecision.destination ? `
                        <div class="routing-destination">
                            <strong>Destination:</strong> 
                            <a href="${routingDecision.destination}" class="destination-link">
                                ${routingDecision.destination}
                            </a>
                        </div>
                    ` : ''}
                </div>
                
                ${this.renderRoutingFlow(state, certInfo)}
                ${this.renderAccessControl(certInfo)}
            </div>
        `;
    }

    private getRoutingDecision(state: CertificateState, certInfo: CertificateInfo | null): RoutingDecision {
        switch (state) {
            case 'none':
                return {
                    action: 'redirect',
                    destination: '/certm3/index.html',
                    reason: 'No Certificate Provided',
                    message: 'No client certificate was detected. Users should obtain a certificate to access protected resources.'
                };
            
            case 'invalid':
                return {
                    action: 'redirect',
                    destination: '/certm3/error.html',
                    reason: 'Invalid Certificate',
                    message: 'The provided certificate is invalid or not trusted by our CA. Please check your certificate or contact support.'
                };
            
            case 'expired':
                return {
                    action: 'redirect',
                    destination: '/certm3/renew.html',
                    reason: 'Expired Certificate',
                    message: 'Your certificate has expired. Please renew your certificate to continue accessing protected resources.'
                };
            
            case 'valid':
                if (!certInfo) {
                    return {
                        action: 'redirect',
                        destination: '/certm3/error.html',
                        reason: 'Certificate Validation Error',
                        message: 'Certificate appears valid but could not be parsed. Please contact support.'
                    };
                }
                
                return {
                    action: 'proceed',
                    destination: '/certm3/dashboard.html',
                    reason: 'Valid Certificate',
                    message: `Certificate for ${certInfo.cn} is valid and trusted. Access granted to appropriate resources.`
                };
            
            default:
                return {
                    action: 'redirect',
                    destination: '/certm3/index.html',
                    reason: 'Unknown Certificate State',
                    message: 'Unable to determine certificate state. Please try again or contact support.'
                };
        }
    }

    private renderRoutingFlow(state: CertificateState, certInfo: CertificateInfo | null): string {
        const steps = this.getRoutingSteps(state, certInfo);
        
        return `
            <div class="routing-flow">
                <h5>Routing Flow</h5>
                <div class="flow-steps">
                    ${steps.map((step, index) => `
                        <div class="flow-step ${step.completed ? 'completed' : ''} ${step.current ? 'current' : ''}">
                            <div class="step-number">${index + 1}</div>
                            <div class="step-content">
                                <div class="step-title">${step.title}</div>
                                <div class="step-description">${step.description}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    private renderAccessControl(certInfo: CertificateInfo | null): string {
        if (!certInfo || !certInfo.groups || certInfo.groups.length === 0) {
            return `
                <div class="access-control">
                    <h5>Access Control</h5>
                    <p class="no-access">No group memberships found. Access limited to public resources.</p>
                </div>
            `;
        }

        const accessLevels = this.getAccessLevels(certInfo.groups);
        
        return `
            <div class="access-control">
                <h5>Access Control</h5>
                <div class="access-levels">
                    ${accessLevels.map(level => `
                        <div class="access-level ${level.granted ? 'granted' : 'denied'}">
                            <div class="access-resource">${level.resource}</div>
                            <div class="access-status">
                                <span class="status-icon">${level.granted ? '✅' : '❌'}</span>
                                <span class="status-text">${level.granted ? 'Granted' : 'Denied'}</span>
                            </div>
                            <div class="access-reason">${level.reason}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    private getRoutingSteps(state: CertificateState, certInfo: CertificateInfo | null): Array<{
        title: string;
        description: string;
        completed: boolean;
        current: boolean;
    }> {
        const steps = [
            {
                title: 'Certificate Detection',
                description: 'Check if client certificate is provided',
                completed: state !== 'none',
                current: state === 'none'
            },
            {
                title: 'Certificate Validation',
                description: 'Verify certificate signature and trust chain',
                completed: state === 'valid' || state === 'expired',
                current: state === 'invalid'
            },
            {
                title: 'Expiry Check',
                description: 'Verify certificate is not expired',
                completed: state === 'valid',
                current: state === 'expired'
            },
            {
                title: 'Access Control',
                description: 'Check group memberships and permissions',
                completed: state === 'valid',
                current: state === 'valid'
            }
        ];

        return steps;
    }

    private getAccessLevels(groups: string[]): Array<{
        resource: string;
        granted: boolean;
        reason: string;
    }> {
        const accessLevels = [
            {
                resource: 'Public Resources',
                granted: true,
                reason: 'Available to all users'
            },
            {
                resource: 'User Dashboard',
                granted: groups.includes('users'),
                reason: groups.includes('users') ? 'Member of users group' : 'Requires users group membership'
            },
            {
                resource: 'Admin Panel',
                granted: groups.includes('admins'),
                reason: groups.includes('admins') ? 'Member of admins group' : 'Requires admins group membership'
            },
            {
                resource: 'Developer Tools',
                granted: groups.includes('developers'),
                reason: groups.includes('developers') ? 'Member of developers group' : 'Requires developers group membership'
            }
        ];

        return accessLevels;
    }

    private getActionIcon(action: string): string {
        switch (action) {
            case 'proceed': return '✅';
            case 'redirect': return '🔄';
            case 'block': return '🚫';
            default: return '❓';
        }
    }
} 
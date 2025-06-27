import { apiService } from './api';
import { cryptoService } from './crypto';
import { stateManager } from './state';
import { InitialRequest, ValidationRequest, Group } from './types';

class CertificateService {
    async submitInitialRequest(request: InitialRequest): Promise<void> {
        try {
            const response = await apiService.submitInitialRequest(request);
            stateManager.setValidationState({ requestId: response.requestId, error: undefined });
            stateManager.setCurrentStep('validation');
        } catch (error: any) {
            stateManager.setValidationState({ error: error.message });
            throw error;
        }
    }

    async validateEmail(request: ValidationRequest): Promise<void> {
        try {
            const response = await apiService.validateEmail(request);
            stateManager.setCertificateState({ jwt: response.jwt, error: undefined });
            stateManager.setCurrentStep('certificate');
            await this.loadGroups();
        } catch (error: any) {
            stateManager.setValidationState({ error: error.message });
            throw error;
        }
    }

    async loadGroups(): Promise<void> {
        try {
            const jwt = stateManager.getCertificateState().jwt;
            if (!jwt) throw new Error('No JWT token available');
            const groups = await apiService.getGroups(jwt);
            stateManager.setCertificateState({ 
                availableGroups: groups, 
                selectedGroups: [], // Reset selected groups when loading new ones
                error: undefined 
            });
        } catch (error: any) {
            stateManager.setCertificateState({ error: error.message });
            throw error;
        }
    }

    async generateCertificate(): Promise<void> {
        try {
            const state = stateManager.getCertificateState();
            if (!state.selectedGroups || state.selectedGroups.length === 0) {
                throw new Error('Please select at least one group');
            }

            // For demo, use requestId as username (should be changed to real username if available)
            const username = stateManager.getValidationState().requestId || 'user';
            
            // Generate key pair
            const keyPair = await cryptoService.generateKeyPair();
            
            // Create CSR using the private key
            const csr = await cryptoService.generateCsr(username, keyPair.privateKey, state.selectedGroups);
            
            const jwt = state.jwt;
            if (!jwt) throw new Error('No JWT token available');
            
            // Send CSR to middleware for signing
            const response = await apiService.submitCsr({ csr, groups: state.selectedGroups }, jwt);
            
            // Store certificate and encrypted private key in state
            stateManager.setCertificateState({ 
                certificate: response.certificate, 
                privateKey: keyPair.privateKey,  // Will be encrypted before PKCS12 creation
                error: undefined 
            });
            stateManager.setCurrentStep('certificate');
        } catch (error: any) {
            stateManager.setCertificateState({ error: error.message });
            throw error;
        }
    }

    async downloadPKCS12(passphrase: string): Promise<void> {
        try {
            const state = stateManager.getCertificateState();
            if (!state.certificate || !state.privateKey) throw new Error('No certificate or private key available');
            
            // Encrypt the private key with the passphrase
            const encryptedPrivateKey = cryptoService.encryptPrivateKey(state.privateKey, passphrase);
            
            // Create and download PKCS12 with the encrypted private key
            cryptoService.createAndDownloadPKCS12(
                state.certificate,
                encryptedPrivateKey,
                passphrase,
                'certificate.p12'
            );
            
            // Clear state after successful download
            stateManager.reset();
        } catch (error: any) {
            stateManager.setCertificateState({ error: error.message });
            throw error;
        }
    }

    toggleGroup(groupId: string): void {
        const state = stateManager.getCertificateState();
        const selectedGroups = [...state.selectedGroups];
        const index = selectedGroups.indexOf(groupId);
        if (index === -1) {
            selectedGroups.push(groupId);
        } else {
            selectedGroups.splice(index, 1);
        }
        stateManager.setCertificateState({ selectedGroups });
    }

    validateGroupSelection(): boolean {
        const state = stateManager.getCertificateState();
        return state.selectedGroups && state.selectedGroups.length > 0;
    }
}

export const certificateService = new CertificateService(); 
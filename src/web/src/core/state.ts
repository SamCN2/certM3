import { AppState, ValidationState, CertificateState, Group } from './types';

// Initial validation state
export const initialValidationState: ValidationState = {
  requestId: undefined,
  error: undefined
};

// Initial certificate state
export const initialCertificateState: CertificateState = {
  availableGroups: [],
  selectedGroups: [],
  jwt: undefined,
  certificate: undefined,
  privateKey: undefined,
  error: undefined
};

// State management class
export class StateManager {
  private state: AppState;
  private listeners: Array<() => void>;
  private readonly STORAGE_KEY = 'certm3_state';

  constructor() {
    this.state = this.loadState() || {
      validation: { ...initialValidationState },
      certificate: { ...initialCertificateState },
      currentStep: 'initial'
    };
    this.listeners = [];
  }

  private loadState(): AppState | null {
    try {
      const savedState = localStorage.getItem(this.STORAGE_KEY);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        // Validate the loaded state
        if (this.isValidState(parsed)) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Failed to load state:', error);
    }
    return null;
  }

  private saveState(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  private isValidState(state: any): state is AppState {
    return (
      state &&
      typeof state === 'object' &&
      typeof state.currentStep === 'string' &&
      ['initial', 'validation', 'csr', 'certificate'].includes(state.currentStep) &&
      typeof state.validation === 'object' &&
      typeof state.certificate === 'object' &&
      Array.isArray(state.certificate.availableGroups) &&
      Array.isArray(state.certificate.selectedGroups)
    );
  }

  public getState(): AppState {
    return { ...this.state };
  }

  public getValidationState(): ValidationState {
    return { ...this.state.validation };
  }

  public getCertificateState(): CertificateState {
    return { ...this.state.certificate };
  }

  public getCurrentStep(): AppState['currentStep'] {
    return this.state.currentStep;
  }

  public setValidationState(validation: Partial<ValidationState>): void {
    this.state.validation = { ...this.state.validation, ...validation };
    this.saveState();
    this.notifyListeners();
  }

  public setCertificateState(certificate: Partial<CertificateState>): void {
    this.state.certificate = { ...this.state.certificate, ...certificate };
    this.saveState();
    this.notifyListeners();
  }

  public setCurrentStep(step: AppState['currentStep']): void {
    this.state.currentStep = step;
    this.saveState();
    this.notifyListeners();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  public reset(): void {
    this.state = {
      validation: { ...initialValidationState },
      certificate: { ...initialCertificateState },
      currentStep: 'initial'
    };
    localStorage.removeItem(this.STORAGE_KEY);
    this.notifyListeners();
  }

  // Group management methods
  public setAvailableGroups(groups: Group[]): void {
    if (!Array.isArray(groups)) {
      throw new Error('Groups must be an array');
    }
    this.state.certificate.availableGroups = groups;
    this.saveState();
    this.notifyListeners();
  }

  public toggleGroupSelection(groupId: string): void {
    if (!this.state.certificate.availableGroups.some(g => g.id === groupId)) {
      throw new Error('Invalid group ID');
    }

    const selectedGroups = [...this.state.certificate.selectedGroups];
    const index = selectedGroups.indexOf(groupId);
    
    if (index === -1) {
      selectedGroups.push(groupId);
    } else {
      selectedGroups.splice(index, 1);
    }
    
    this.state.certificate.selectedGroups = selectedGroups;
    this.saveState();
    this.notifyListeners();
  }

  public clearGroupSelection(): void {
    this.state.certificate.selectedGroups = [];
    this.saveState();
    this.notifyListeners();
  }

  // Debug methods
  public getStateHistory(): string[] {
    try {
      const history = localStorage.getItem(`${this.STORAGE_KEY}_history`);
      return history ? JSON.parse(history) : [];
    } catch {
      return [];
    }
  }

  private addToHistory(action: string): void {
    try {
      const history = this.getStateHistory();
      history.push(`${new Date().toISOString()} - ${action}`);
      localStorage.setItem(`${this.STORAGE_KEY}_history`, JSON.stringify(history.slice(-50))); // Keep last 50 entries
    } catch (error) {
      console.error('Failed to update state history:', error);
    }
  }
}

// Create singleton instance
export const stateManager = new StateManager(); 
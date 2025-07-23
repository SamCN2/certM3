/**
 * Form validation utilities for CertM3 frontend
 * Prevents premature form submission and tracks validation state
 */

export interface ValidationState {
  isPassphraseValid: boolean;
  isPassphraseConfirmed: boolean;
  isGroupSelected: boolean;
  isFormValid: boolean;
}

export class FormValidator {
  private validationState: ValidationState = {
    isPassphraseValid: false,
    isPassphraseConfirmed: false,
    isGroupSelected: false,
    isFormValid: false
  };

  private passphraseInput: HTMLInputElement | null = null;
  private confirmPassphraseInput: HTMLInputElement | null = null;
  private groupSelect: HTMLSelectElement | null = null;
  private generateButton: HTMLButtonElement | null = null;
  private feedbackElement: HTMLElement | null = null;
  private passphraseMatchFeedback: HTMLElement | null = null;

  constructor() {
    this.initializeElements();
    this.setupEventListeners();
  }

  private initializeElements(): void {
    this.passphraseInput = document.getElementById('passphrase') as HTMLInputElement;
    this.confirmPassphraseInput = document.getElementById('confirmPassphrase') as HTMLInputElement;
    this.groupSelect = document.getElementById('groupSelect') as HTMLSelectElement;
    this.generateButton = document.getElementById('generateCertBtn') as HTMLButtonElement;
    this.feedbackElement = document.getElementById('generate-feedback');
    this.passphraseMatchFeedback = document.getElementById('passphrase-match-feedback');
  }

  private setupEventListeners(): void {
    // Passphrase validation
    if (this.passphraseInput) {
      this.passphraseInput.addEventListener('input', () => {
        this.validatePassphrase();
      });
    }

    // Confirm passphrase validation
    if (this.confirmPassphraseInput) {
      this.confirmPassphraseInput.addEventListener('input', () => {
        this.validatePassphraseConfirmation();
      });
    }

    // Group selection validation
    if (this.groupSelect) {
      this.groupSelect.addEventListener('change', () => {
        this.validateGroupSelection();
      });
    }

    // Prevent form submission on Enter key
    if (this.passphraseInput) {
      this.passphraseInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.confirmPassphraseInput?.focus();
        }
      });
    }

    if (this.confirmPassphraseInput) {
      this.confirmPassphraseInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (this.validationState.isFormValid) {
            this.generateButton?.click();
          }
        }
      });
    }
  }

  private validatePassphrase(): void {
    if (!this.passphraseInput) return;

    const passphrase = this.passphraseInput.value.trim();
    this.validationState.isPassphraseValid = passphrase.length >= 8;

    // Enable/disable confirm passphrase field
    if (this.confirmPassphraseInput) {
      this.confirmPassphraseInput.disabled = !this.validationState.isPassphraseValid;
      if (!this.validationState.isPassphraseValid) {
        this.confirmPassphraseInput.value = '';
        this.validationState.isPassphraseConfirmed = false;
      }
    }

    this.updateValidationState();
  }

  private validatePassphraseConfirmation(): void {
    if (!this.passphraseInput || !this.confirmPassphraseInput) return;

    const passphrase = this.passphraseInput.value.trim();
    const confirmPassphrase = this.confirmPassphraseInput.value.trim();
    
    this.validationState.isPassphraseConfirmed = 
      passphrase === confirmPassphrase && passphrase.length > 0;

    // Update feedback
    if (this.passphraseMatchFeedback) {
      if (confirmPassphrase.length === 0) {
        this.passphraseMatchFeedback.textContent = '';
        this.passphraseMatchFeedback.className = 'feedback';
      } else if (this.validationState.isPassphraseConfirmed) {
        this.passphraseMatchFeedback.textContent = '✓ Passphrases match';
        this.passphraseMatchFeedback.className = 'feedback success';
      } else {
        this.passphraseMatchFeedback.textContent = '✗ Passphrases do not match';
        this.passphraseMatchFeedback.className = 'feedback error';
      }
    }

    this.updateValidationState();
  }

  private validateGroupSelection(): void {
    if (!this.groupSelect) return;

    const selectedGroups = Array.from(this.groupSelect.selectedOptions).map(option => option.value);
    this.validationState.isGroupSelected = selectedGroups.length > 0;

    this.updateValidationState();
  }

  private updateValidationState(): void {
    this.validationState.isFormValid = 
      this.validationState.isPassphraseValid &&
      this.validationState.isPassphraseConfirmed &&
      this.validationState.isGroupSelected;

    // Update button state
    if (this.generateButton) {
      this.generateButton.disabled = !this.validationState.isFormValid;
    }

    // Clear any existing error feedback when form becomes valid
    if (this.validationState.isFormValid && this.feedbackElement) {
      this.feedbackElement.textContent = '';
      this.feedbackElement.className = '';
    }
  }

  public getValidationState(): ValidationState {
    return { ...this.validationState };
  }

  public isValid(): boolean {
    return this.validationState.isFormValid;
  }

  public getFormData(): {
    passphrase: string;
    selectedGroups: string[];
  } | null {
    if (!this.isValid()) return null;

    return {
      passphrase: this.passphraseInput?.value.trim() || '',
      selectedGroups: Array.from(this.groupSelect?.selectedOptions || []).map(option => option.value)
    };
  }

  public showError(message: string): void {
    if (this.feedbackElement) {
      this.feedbackElement.textContent = message;
      this.feedbackElement.className = 'feedback error';
    }
  }

  public clearError(): void {
    if (this.feedbackElement) {
      this.feedbackElement.textContent = '';
      this.feedbackElement.className = '';
    }
  }
} 
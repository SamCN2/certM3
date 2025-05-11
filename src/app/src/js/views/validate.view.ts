import { BaseView } from './base.view';
import { ApiService } from '../services/api.service';

export class ValidateView extends BaseView {
  private apiService: ApiService;

  constructor() {
    super('validate');
    this.apiService = ApiService.getInstance();
    this.render();
  }

  protected render(): void {
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

  private setupEventListeners(): void {
    const form = this.element.querySelector('#validate-email-form') as HTMLFormElement;
    form.addEventListener('submit', this.handleSubmit.bind(this));
  }

  private async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const email = formData.get('email') as string;
    
    this.setLoading(true);
    this.hideMessages();

    try {
      const response = await this.apiService.validateEmail(email);

      if (response.success) {
        this.showSuccess('Email validated successfully!');
        form.reset();
      } else {
        this.showError(response.error || 'Failed to validate email');
      }
    } catch (error) {
      this.showError('An unexpected error occurred');
      console.error('Error validating email:', error);
    } finally {
      this.setLoading(false);
    }
  }

  private setLoading(isLoading: boolean): void {
    const button = this.element.querySelector('button[type="submit"]') as HTMLButtonElement;
    const loader = button.querySelector('.loader') as HTMLElement;
    const buttonText = button.querySelector('.button-text') as HTMLElement;
    
    button.disabled = isLoading;
    loader.style.display = isLoading ? 'inline-block' : 'none';
    buttonText.style.display = isLoading ? 'none' : 'inline-block';
  }

  private showError(message: string): void {
    const errorMessage = this.element.querySelector('.error.message') as HTMLElement;
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
  }

  private showSuccess(message: string): void {
    const successMessage = this.element.querySelector('.success.message') as HTMLElement;
    successMessage.textContent = message;
    successMessage.style.display = 'block';
  }

  private hideMessages(): void {
    const messages = this.element.querySelectorAll('.message');
    messages.forEach(msg => (msg as HTMLElement).style.display = 'none');
  }
} 
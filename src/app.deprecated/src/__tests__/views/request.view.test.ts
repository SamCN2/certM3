import { RequestView } from '../../js/views/request.view';

// Mock environment variables
process.env.CA_CERT_PATH = 'test/ca.crt';
process.env.CA_KEY_PATH = 'test/ca.key';

// Mock the fetch API
global.fetch = jest.fn();

beforeAll(() => {
  jest.spyOn(window.location, 'replace').mockImplementation(() => {});
});

describe('RequestView', () => {
  let view: RequestView;

  beforeEach(() => {
    // Set up the DOM
    document.body.innerHTML = `
      <form id="user-request-form">
        <input name="username" />
        <input name="email" />
        <input name="displayName" />
        <button type="submit">
          <span class="loader"></span>
          <span class="button-text">Submit</span>
        </button>
      </form>
      <div class="username-validation"></div>
      <div class="success message"></div>
      <div class="error message"></div>
    `;

    // Create a new instance for each test
    view = new RequestView();
  });

  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('username validation', () => {
    it('should show error for invalid username format', async () => {
      const input = document.querySelector('input[name="username"]') as HTMLInputElement;
      const validationLabel = document.querySelector('.username-validation') as HTMLElement;

      // Simulate input with invalid format
      input.value = 'invalid-username';
      input.dispatchEvent(new Event('input'));

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(validationLabel.textContent).toBe('Username must contain only lowercase letters and numbers');
      expect(validationLabel.className).toContain('red');
    });

    it('should show available message for valid username', async () => {
      const input = document.querySelector('input[name="username"]') as HTMLInputElement;
      const validationLabel = document.querySelector('.username-validation') as HTMLElement;

      // Mock fetch to return 404 (username available)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 404
      });

      // Simulate input with valid format
      input.value = 'validusername';
      input.dispatchEvent(new Event('input'));

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(validationLabel.textContent).toBe('Username is available');
      expect(validationLabel.className).toContain('green');
    });

    it('should show unavailable message for taken username', async () => {
      const input = document.querySelector('input[name="username"]') as HTMLInputElement;
      const validationLabel = document.querySelector('.username-validation') as HTMLElement;

      // Mock fetch to return 200 (username taken)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200
      });

      // Simulate input with valid format
      input.value = 'takenusername';
      input.dispatchEvent(new Event('input'));

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(validationLabel.textContent).toBe('Username is not available');
      expect(validationLabel.className).toContain('red');
    });
  });

  describe('form submission', () => {
    it('should show success message and redirect on successful submission', async () => {
      const form = document.querySelector('#user-request-form') as HTMLFormElement;
      const successMessage = document.querySelector('.success.message') as HTMLElement;
      const button = form.querySelector('button[type="submit"]') as HTMLButtonElement;
      const loader = button.querySelector('.loader') as HTMLElement;
      const buttonText = button.querySelector('.button-text') as HTMLElement;

      // Mock fetch to return success
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            message: 'Request submitted successfully! Please check your email for the validation link.',
            redirect: '/app/validate/test-request-id'
          }
        })
      });

      // Fill form
      const usernameInput = form.querySelector('input[name="username"]') as HTMLInputElement;
      const emailInput = form.querySelector('input[name="email"]') as HTMLInputElement;
      const displayNameInput = form.querySelector('input[name="displayName"]') as HTMLInputElement;

      usernameInput.value = 'testuser';
      emailInput.value = 'test@example.com';
      displayNameInput.value = 'Test User';

      // Submit form
      form.dispatchEvent(new Event('submit'));

      // Check loading state immediately after submission
      expect(button.disabled).toBe(true);
      expect(loader.style.display).toBe('inline-block');
      expect(buttonText.style.display).toBe('none');

      // Wait for async operations and redirect delay
      await new Promise(resolve => setTimeout(resolve, 2100));

      // Check success message
      expect(successMessage.textContent).toBe('Request submitted successfully! Please check your email for the validation link.');
      expect(successMessage.style.display).toBe('block');

      // Check redirect
      expect(window.location.replace).toHaveBeenCalledWith('/app/validate/test-request-id');
    });

    it('should show error message on failed submission', async () => {
      const form = document.querySelector('#user-request-form') as HTMLFormElement;
      const errorMessage = document.querySelector('.error.message') as HTMLElement;

      // Mock fetch to return error
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          error: 'Test error message'
        })
      });

      // Fill form
      const usernameInput = form.querySelector('input[name="username"]') as HTMLInputElement;
      const emailInput = form.querySelector('input[name="email"]') as HTMLInputElement;
      const displayNameInput = form.querySelector('input[name="displayName"]') as HTMLInputElement;

      usernameInput.value = 'testuser';
      emailInput.value = 'test@example.com';
      displayNameInput.value = 'Test User';

      // Submit form
      form.dispatchEvent(new Event('submit'));

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check error message
      expect(errorMessage.textContent).toBe('Test error message');
      expect(errorMessage.style.display).toBe('block');
    });

    it('should show generic error message on unexpected error', async () => {
      const form = document.querySelector('#user-request-form') as HTMLFormElement;
      const errorMessage = document.querySelector('.error.message') as HTMLElement;

      // Mock fetch to throw error
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      // Fill form
      const usernameInput = form.querySelector('input[name="username"]') as HTMLInputElement;
      const emailInput = form.querySelector('input[name="email"]') as HTMLInputElement;
      const displayNameInput = form.querySelector('input[name="displayName"]') as HTMLInputElement;

      usernameInput.value = 'testuser';
      emailInput.value = 'test@example.com';
      displayNameInput.value = 'Test User';

      // Submit form
      form.dispatchEvent(new Event('submit'));

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check error message
      expect(errorMessage.textContent).toBe('An unexpected error occurred');
      expect(errorMessage.style.display).toBe('block');
    });
  });
}); 
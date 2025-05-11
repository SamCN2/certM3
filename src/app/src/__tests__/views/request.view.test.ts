import { RequestView } from '../../js/views/request.view';
import { ApiService } from '../../js/services/api.service';
import '@testing-library/jest-dom';

// Mock the API service
jest.mock('../../js/services/api.service');

describe('RequestView', () => {
  let view: RequestView;
  let mockApiService: jest.Mocked<ApiService>;

  beforeEach(() => {
    document.body.innerHTML = '<div id="app-content"></div>';
    mockApiService = {
      createRequest: jest.fn(),
      validateUsername: jest.fn(),
      validateEmail: jest.fn(),
      generateCertificate: jest.fn(),
    } as any;
    (ApiService.getInstance as jest.Mock).mockReturnValue(mockApiService);
    view = new RequestView();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the request form', () => {
    const form = document.querySelector('#user-request-form');
    expect(form).toBeTruthy();
    expect(form?.querySelector('input[name="username"]')).toBeTruthy();
    expect(form?.querySelector('input[name="email"]')).toBeTruthy();
    expect(form?.querySelector('input[name="displayName"]')).toBeTruthy();
  });

  it('should validate username format', async () => {
    const input = document.querySelector('input[name="username"]') as HTMLInputElement;
    const validationLabel = document.querySelector('.username-validation') as HTMLElement;

    // Test invalid format
    input.value = 'invalid@username';
    input.dispatchEvent(new Event('input'));
    await new Promise(resolve => setTimeout(resolve, 500));
    expect(validationLabel.textContent).toContain('Username must be 3-32 characters');

    // Test valid format
    input.value = 'valid_username';
    input.dispatchEvent(new Event('input'));
    await new Promise(resolve => setTimeout(resolve, 500));
    expect(mockApiService.validateUsername).toHaveBeenCalledWith('valid_username');
  });

  it('should handle successful request submission', async () => {
    mockApiService.createRequest.mockResolvedValueOnce({
      success: true,
      data: { requestId: '123' }
    });

    const form = document.querySelector('#user-request-form') as HTMLFormElement;
    const usernameInput = form.querySelector('input[name="username"]') as HTMLInputElement;
    const emailInput = form.querySelector('input[name="email"]') as HTMLInputElement;
    const displayNameInput = form.querySelector('input[name="displayName"]') as HTMLInputElement;

    usernameInput.value = 'testuser';
    emailInput.value = 'test@example.com';
    displayNameInput.value = 'Test User';

    form.dispatchEvent(new Event('submit'));
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockApiService.createRequest).toHaveBeenCalledWith({
      username: 'testuser',
      email: 'test@example.com',
      displayName: 'Test User'
    });

    const successMessage = document.querySelector('.success.message') as HTMLElement;
    expect(successMessage.textContent).toContain('Request submitted successfully');
  });

  it('should handle failed request submission', async () => {
    mockApiService.createRequest.mockResolvedValueOnce({
      success: false,
      error: 'Username already taken'
    });

    const form = document.querySelector('#user-request-form') as HTMLFormElement;
    const usernameInput = form.querySelector('input[name="username"]') as HTMLInputElement;
    const emailInput = form.querySelector('input[name="email"]') as HTMLInputElement;
    const displayNameInput = form.querySelector('input[name="displayName"]') as HTMLInputElement;

    usernameInput.value = 'testuser';
    emailInput.value = 'test@example.com';
    displayNameInput.value = 'Test User';

    form.dispatchEvent(new Event('submit'));
    await new Promise(resolve => setTimeout(resolve, 0));

    const errorMessage = document.querySelector('.error.message') as HTMLElement;
    expect(errorMessage.textContent).toContain('Username already taken');
  });

  it('should handle network errors', async () => {
    mockApiService.createRequest.mockRejectedValueOnce(new Error('Network error'));

    const form = document.querySelector('#user-request-form') as HTMLFormElement;
    const usernameInput = form.querySelector('input[name="username"]') as HTMLInputElement;
    const emailInput = form.querySelector('input[name="email"]') as HTMLInputElement;
    const displayNameInput = form.querySelector('input[name="displayName"]') as HTMLInputElement;

    usernameInput.value = 'testuser';
    emailInput.value = 'test@example.com';
    displayNameInput.value = 'Test User';

    form.dispatchEvent(new Event('submit'));
    await new Promise(resolve => setTimeout(resolve, 0));

    const errorMessage = document.querySelector('.error.message') as HTMLElement;
    expect(errorMessage.textContent).toContain('An unexpected error occurred');
  });
}); 
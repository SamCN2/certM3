// Validation page handling
document.addEventListener('DOMContentLoaded', () => {
  const validateButton = document.getElementById('validate-button');
  const validationCodeInput = document.getElementById('validation-code');
  const errorMessage = document.querySelector('.error.message');
  const successMessage = document.querySelector('.success.message');

  // Get request ID and challenge from URL path
  const pathParts = window.location.pathname.split('/');
  const requestId = pathParts[2]; // /app/validate/{id}/{challenge}
  const challenge = pathParts[3];

  // If we have both ID and challenge, auto-fill and submit
  if (requestId && challenge) {
    validationCodeInput.value = challenge;
    validateButton.click();
    return;
  }

  // If we only have the ID (from request page), show the form
  if (requestId) {
    // Form is already visible, just wait for user to enter challenge
    return;
  }

  // If we have neither, show error
  errorMessage.textContent = 'Invalid validation link. Please check your email for the correct link.';
  errorMessage.style.display = 'block';
  validateButton.disabled = true;

  // Handle validation button click
  validateButton.addEventListener('click', async () => {
    const code = validationCodeInput.value.trim();
    if (!code) {
      errorMessage.textContent = 'Please enter the validation code';
      errorMessage.style.display = 'block';
      return;
    }

    // Show loading state
    const buttonText = validateButton.querySelector('.button-text');
    const loader = validateButton.querySelector('.loader');
    validateButton.disabled = true;
    buttonText.style.display = 'none';
    loader.style.display = 'inline-block';
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';

    try {
      console.log('Submitting validation code:', code);
      const response = await fetch(`/api/requests/${requestId}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ challenge: code })
      });

      if (response.ok) {
        successMessage.textContent = 'Account validated successfully! Redirecting to login...';
        successMessage.style.display = 'block';
        // Redirect to login page after a short delay
        setTimeout(() => {
          window.location.href = '/app';
        }, 2000);
      } else {
        const result = await response.json();
        console.log('Validation response:', result);
        // Format error message properly
        const errorText = result.error?.message || result.message || 'Failed to validate account';
        errorMessage.textContent = typeof errorText === 'string' ? errorText : JSON.stringify(errorText);
        errorMessage.style.display = 'block';
      }
    } catch (error) {
      console.error('Error validating account:', error);
      errorMessage.textContent = error.message || 'An unexpected error occurred';
      errorMessage.style.display = 'block';
    } finally {
      // Reset loading state
      validateButton.disabled = false;
      buttonText.style.display = 'inline-block';
      loader.style.display = 'none';
    }
  });
}); 
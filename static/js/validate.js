// Validation page handling
document.addEventListener('DOMContentLoaded', () => {
  const validateButton = document.getElementById('validate-button');
  const validationCodeInput = document.getElementById('validation-code');
  const errorMessage = document.querySelector('.error.message');
  const successMessage = document.querySelector('.success.message');

  const url = new URL(window.location.href);
  const pathParts = url.pathname.split('/').filter(Boolean);
  let requestId = null;
  let challengeId = null;

  // Check for /app/validate/:requestId/challenge-:challengeId
  if (pathParts.length >= 4 && pathParts[1] === 'validate' && pathParts[3].startsWith('challenge-')) {
    requestId = pathParts[2];
    challengeId = pathParts[3].replace('challenge-', '');
  } else {
    // Check for query params (manual entry)
    requestId = url.searchParams.get('id');
    challengeId = url.searchParams.get('challenge');
  }

  if (requestId && challengeId) {
    // Hide the manual form if present
    const form = document.getElementById('validation-form');
    if (form) form.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'none';
    if (successMessage) successMessage.style.display = 'none';

    // Show a loading indicator
    const loading = document.createElement('div');
    loading.className = 'ui active inline loader';
    loading.textContent = 'Validating...';
    document.body.appendChild(loading);

    // Submit validation automatically
    fetch(`/api/requests/${requestId}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challenge: challengeId })
    })
    .then(async (res) => {
      loading.remove();
      if (res.ok) {
        // Redirect to cert-request page with params
        window.location.href = `/app/cert-request?requestId=${requestId}&challengeId=${challengeId}`;
      } else {
        const data = await res.json().catch(() => ({}));
        if (errorMessage) {
          errorMessage.textContent = data.error || 'Validation failed.';
          errorMessage.style.display = 'block';
        } else {
          alert(data.error || 'Validation failed.');
        }
        // Show manual form for retry
        if (form) form.style.display = '';
      }
    })
    .catch((err) => {
      loading.remove();
      if (errorMessage) {
        errorMessage.textContent = err.message || 'Validation failed.';
        errorMessage.style.display = 'block';
      } else {
        alert(err.message || 'Validation failed.');
      }
      if (form) form.style.display = '';
    });
  } else {
    // Show manual form
    const form = document.getElementById('validation-form');
    if (form) form.style.display = '';
  }

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
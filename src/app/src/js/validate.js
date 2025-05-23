// Validation page handling
document.addEventListener('DOMContentLoaded', () => {
  const validateButton = document.getElementById('validateButton');
  const statusDiv = document.getElementById('status');
  const loadingDiv = document.getElementById('loading');
  const form = document.getElementById('validateForm');

  // Check if we're on a direct validation URL
  const pathParts = window.location.pathname.split('/');
  if (pathParts.length === 5 && pathParts[1] === 'app' && pathParts[2] === 'validate') {
    // We're on a direct validation URL, handle validation automatically
    const requestId = pathParts[3];
    const challenge = pathParts[4];
    submitValidation(requestId, challenge);
    return;
  }

  // If we're not on a direct validation URL, set up the form handlers
  if (!validateButton || !form) {
    console.log('Validation page elements not found, skipping validation setup');
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const requestId = document.getElementById('requestId').value;
    const challenge = document.getElementById('challenge').value;

    if (!requestId || !challenge) {
      statusDiv.textContent = 'Please enter both request ID and challenge';
      statusDiv.className = 'error';
      return;
    }

    await submitValidation(requestId, challenge);
  });

  async function submitValidation(requestId, challenge) {
    try {
      if (validateButton) {
        showLoading();
      }
      if (statusDiv) {
        statusDiv.textContent = '';
      }

      const response = await fetch('/app/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestId, challenge })
      });

      const data = await response.json();

      if (data.success && data.data) {
        // Store the token in sessionStorage for user creation
        sessionStorage.setItem('validationToken', data.data.token);
        // Redirect to certificate request page
        window.location.href = data.data.redirect;
      } else {
        // Handle error response
        const errorMessage = data.error?.message || data.error || 'Validation failed';
        throw new Error(errorMessage);
      }
    } catch (error) {
      if (statusDiv) {
        statusDiv.textContent = `Error: ${error.message}`;
        statusDiv.className = 'error';
      } else {
        // If we're on a direct validation URL and there's no status div,
        // show the error in an alert
        alert(`Error: ${error.message}`);
      }
    } finally {
      if (validateButton) {
        hideLoading();
      }
    }
  }

  function showLoading() {
    if (loadingDiv) {
      loadingDiv.style.display = 'block';
    }
    if (validateButton) {
      validateButton.disabled = true;
    }
  }

  function hideLoading() {
    if (loadingDiv) {
      loadingDiv.style.display = 'none';
    }
    if (validateButton) {
      validateButton.disabled = false;
    }
  }
}); 
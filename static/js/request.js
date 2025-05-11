// Request form handling
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('user-request-form');
  const usernameInput = form.querySelector('input[name="username"]');
  const validationLabel = document.querySelector('.username-validation');
  let usernameTimeout = null;

  // Handle username input with debounce
  usernameInput.addEventListener('input', async (event) => {
    const input = event.target;
    
    // Clear any existing timeout
    if (usernameTimeout) {
      window.clearTimeout(usernameTimeout);
    }

    // Set a new timeout for validation
    usernameTimeout = window.setTimeout(async () => {
      const username = input.value.trim();
      if (!username) {
        validationLabel.style.display = 'none';
        return;
      }

      // Validate format first
      if (!/^[a-z0-9]+$/.test(username)) {
        validationLabel.className = 'ui pointing red label username-validation';
        validationLabel.textContent = 'Username must contain only lowercase letters and numbers';
        validationLabel.style.display = 'block';
        return;
      }

      try {
        console.log('Checking username:', username);
        const response = await fetch('https://urp.ogt11.com/api/request/check-username/' + encodeURIComponent(username));
        console.log('Response status:', response.status);
        
        // 404 means username is available (not found)
        if (response.status === 404) {
          console.log('Username not found (404) - marking as available');
          validationLabel.className = 'ui pointing green label username-validation';
          validationLabel.textContent = 'Username is available';
          validationLabel.style.display = 'block';
          return;
        }

        // 200 means username exists (not available)
        if (response.status === 200) {
          console.log('Username found (200) - marking as not available');
          validationLabel.className = 'ui pointing red label username-validation';
          validationLabel.textContent = 'Username is not available';
          validationLabel.style.display = 'block';
          return;
        }

        // For any other status code, show error
        console.log('Unexpected status code:', response.status);
        validationLabel.className = 'ui pointing red label username-validation';
        validationLabel.textContent = 'Error checking username availability';
        validationLabel.style.display = 'block';
      } catch (error) {
        console.error('Error validating username:', error);
        validationLabel.style.display = 'none';
      }
    }, 500); // Debounce for 500ms
  });

  // Handle form submission
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    const button = form.querySelector('button[type="submit"]');
    const loader = button.querySelector('.loader');
    const buttonText = button.querySelector('.button-text');
    const errorMessage = document.querySelector('.error.message');
    const successMessage = document.querySelector('.success.message');
    
    // Show loading state
    button.disabled = true;
    loader.style.display = 'inline-block';
    buttonText.style.display = 'none';
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: data.username,
          email: data.email,
          displayName: data.displayName
        })
      });

      const result = await response.json();

      if (response.ok) {
        successMessage.textContent = 'Request submitted successfully! Please check your email for the validation link.';
        successMessage.style.display = 'block';
        form.reset();
        
        // For testing purposes, redirect to validation page with request ID
        // In production, this would be handled by the email link
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          setTimeout(() => {
            window.location.href = `/app/validate/${result.id}`;
          }, 2000);
        }
      } else {
        errorMessage.textContent = result.error || 'Failed to submit request';
        errorMessage.style.display = 'block';
      }
    } catch (error) {
      errorMessage.textContent = 'An unexpected error occurred';
      errorMessage.style.display = 'block';
      console.error('Error submitting form:', error);
    } finally {
      // Reset loading state
      button.disabled = false;
      loader.style.display = 'none';
      buttonText.style.display = 'inline-block';
    }
  });
}); 
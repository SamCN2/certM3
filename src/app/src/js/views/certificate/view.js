// Certificate view handling
document.addEventListener('DOMContentLoaded', () => {
  console.log(`Certificate view loaded at ${new Date().toISOString()}`);
  const form = document.getElementById('certificate-form');
  const passphraseInput = form.querySelector('input[name="passphrase"]');
  const groupSelect = form.querySelector('select[name="group"]');
  const submitButton = form.querySelector('button[type="submit"]');
  const loadingDiv = document.getElementById('loading');
  const errorMessage = document.querySelector('.error.message');
  const successMessage = document.querySelector('.success.message');
  const entropyMeter = document.getElementById('entropy-meter');

  // Initialize Semantic UI dropdown
  $(groupSelect).dropdown({
    allowAdditions: false,
    hideAdditions: true,
    clearable: true,
    placeholder: 'Select a group...'
  });

  // Load available groups
  async function loadGroups() {
    console.log('Loading groups...');
    try {
      // Mock the Users group for now
      const groups = [{
        name: 'users',
        displayName: 'Users'
      }];
      
      console.log('Using mock groups:', groups);
      
      groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.name;
        option.textContent = group.displayName;
        groupSelect.appendChild(option);
      });
      console.log('Groups loaded successfully');
    } catch (error) {
      console.error('Error loading groups:', error);
      errorMessage.textContent = 'Failed to load groups';
      errorMessage.style.display = 'block';
    }
  }

  // Calculate Shannon entropy in bits
  function calculateEntropy(password) {
    if (!password) return 0;
    
    // Count character frequencies
    const freq = {};
    for (let i = 0; i < password.length; i++) {
      const char = password[i];
      freq[char] = (freq[char] || 0) + 1;
    }
    
    // Calculate Shannon entropy
    let entropy = 0;
    const len = password.length;
    for (const char in freq) {
      const p = freq[char] / len;
      entropy -= p * Math.log2(p);
    }
    
    // Return integer number of bits
    return Math.floor(entropy);
  }

  // Update entropy meter
  function updateEntropyMeter(password) {
    const entropy = calculateEntropy(password);
    const maxEntropy = 10; // Lower max entropy for better visualization
    const percent = Math.min(100, (entropy / maxEntropy) * 100);

    $(entropyMeter).progress({
      percent: percent,
      showActivity: false
    });

    // Update label to show integer bits
    entropyMeter.querySelector('.label').textContent = `${entropy} bits`;
    
    // Enable/disable submit button based on entropy (lowered to 2 bits for testing)
    submitButton.disabled = entropy < 2;
  }

  // Show loading state
  function showLoading() {
    if (loadingDiv) loadingDiv.style.display = 'block';
    if (submitButton) submitButton.disabled = true;
  }

  // Hide loading state
  function hideLoading() {
    if (loadingDiv) loadingDiv.style.display = 'none';
    if (submitButton) submitButton.disabled = calculateEntropy(passphraseInput.value) < 2;
  }

  // Handle form submission
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    console.log('Form submitted');
    const passphrase = passphraseInput.value;
    const groupId = groupSelect.value;

    // Get token and requestId from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const requestId = urlParams.get('requestId');
    const username = urlParams.get('username');

    if (!token || !requestId) {
      errorMessage.textContent = 'Missing token or request ID';
      errorMessage.style.display = 'block';
      return;
    }

    // Check entropy
    const entropy = calculateEntropy(passphrase);
    if (entropy < 2) {
      errorMessage.textContent = `Passphrase entropy (${entropy} bits) is too low. Please use a stronger passphrase.`;
      errorMessage.style.display = 'block';
      return;
    }

    showLoading();
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';

    try {
      // Generate key pair
      console.log('Generating key pair...');
      const keyPair = await crypto.generateKeyPair();
      console.log('Key pair generated successfully');
      
      // Generate CSR
      console.log('Generating CSR...');
      const csr = await crypto.generateCSR(keyPair, {
        commonName: 'User Certificate',
        organization: 'Organization',
        organizationalUnit: 'IT',
        locality: 'City',
        state: 'State',
        country: 'US'
      });
      console.log('CSR generated successfully');

      // Submit CSR to server
      console.log('Submitting CSR to server...');
      const response = await fetch('/app/certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          csr: csr,
          groupId: groupId,
          token: token,
          requestId: requestId
        })
      });
      console.log('Server response received, status:', response.status);

      const result = await response.json();
      console.log('Certificate response:', result);

      if (response.ok && result.data && result.data.certificate) {
        // Create PKCS#12 bundle
        console.log('Creating PKCS#12 bundle...');
        const pkcs12 = await crypto.createPKCS12(
          result.data.certificate,
          keyPair.privateKey,
          passphrase
        );
        console.log('PKCS#12 bundle created successfully');

        // Create a download link and trigger it
        console.log('Creating download link...');
        const blob = new Blob([forge.util.decode64(pkcs12)], { type: 'application/x-pkcs12' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = username ? `${username}.certM3.p12` : 'certificate.p12';
        document.body.appendChild(a);
        console.log('Triggering download...');
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('Download triggered successfully');
        
        successMessage.textContent = 'Certificate generated and downloaded successfully!';
        successMessage.style.display = 'block';
      } else {
        console.error('Invalid response format:', result);
        const errorMsg = result.error || result.message || 'Failed to generate certificate';
        console.error('Certificate generation failed:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('Error generating certificate:', error);
      errorMessage.textContent = error.message || 'An unexpected error occurred';
      errorMessage.style.display = 'block';
    } finally {
      hideLoading();
    }
  });

  // Update entropy meter on password input
  passphraseInput.addEventListener('input', () => {
    updateEntropyMeter(passphraseInput.value);
  });

  // Load groups when page loads
  loadGroups();
}); 
require('dotenv').config({ path: './test.env' });
const axios = require('axios');
const forge = require('node-forge');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Function to generate unique username (3-32 chars, alphanumeric only)
function generateUniqueUsername() {
  const random = Math.floor(100000 + Math.random() * 900000); // Random 6-digit number
  return `test${random}`; // Will be 7-10 chars, alphanumeric only
}

// Function to generate a valid validation code (6-32 chars, alphanumeric)
function generateValidationCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Function to get challenge code from validation email
async function getChallengeCode(username) {
  const { stdout: files } = await execPromise('ls -t /var/spool/certM3/test-emails/');
  const matchingFiles = files.trim().split('\n').filter(file => file.includes(username));
  if (matchingFiles.length === 0) {
    throw new Error(`No validation email found for username: ${username}`);
  }
  const { stdout: emailContent } = await execPromise(`cat "/var/spool/certM3/test-emails/${matchingFiles[0]}"`);
  const match = emailContent.match(/Your validation code is: (challenge-[a-f0-9-]+)/);
  if (!match) {
    throw new Error('Challenge code not found in email content');
  }
  return match[1];
}

const api = axios.create({
  baseURL: process.env.MIDDLEWARE_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add response interceptor for error logging
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      console.error('Response error:', {
        status: error.response.status,
        data: error.response.data,
        details: error.response.data?.error?.details,
        headers: error.response.headers
      });
    }
    return Promise.reject(error);
  }
);

// Add request interceptor for logging
api.interceptors.request.use(
  config => {
    console.log('Sending request:', {
      method: config.method,
      url: config.url,
      headers: config.headers,
      data: config.data
    });
    return config;
  },
  error => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

let testUsername = generateUniqueUsername();
let requestId;
let jwt;
let challengeCode;

describe('CertM3 Middleware Tests', () => {
  // Username Check - Initial availability
  test('/app/check-username/{username} - Check initial username availability', async () => {
    // Test with the username we'll use for the certificate request
    console.log('Testing initial availability of username:', testUsername);
    const response = await api.get(`/app/check-username/${testUsername}`);
    console.log('Initial username response:', response.data);
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('available');
    expect(response.data.available).toBe(true);
  });

  // Basic Health Check
  test('/app/health - Health check endpoint', async () => {
    const response = await api.get('/health');
    expect(response.status).toBe(200);
    expect(response.data).toEqual('healthy\n');
  });

  // Certificate Request Flow
  test('/app/initiate-request - Initiate certificate request', async () => {
    const initiateResponse = await api.post('/app/initiate-request', {
      email: `${testUsername}@example.com`,
      username: testUsername,
      displayName: 'Test User'
    });
    expect(initiateResponse.status).toBe(200);
    expect(initiateResponse.data).toHaveProperty('id');
    requestId = initiateResponse.data.id;
  });

  test('/app/validate-email - Validate email with challenge token', async () => {
    // Wait for email to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get the challenge token from the email
    const challengeToken = await getChallengeCode(testUsername);
    expect(challengeToken).toBeTruthy();

    const validateResponse = await api.post('/app/validate-email', {
      requestId,
      challengeToken
    });
    expect(validateResponse.status).toBe(200);
    expect(validateResponse.data).toHaveProperty('token');
    jwt = validateResponse.data.token;

  });
  
  test('/app/groups/{username} - Get user groups', async () => {
    const groupsResponse = await api.get(`/app/groups/${testUsername}`, {
      headers: {
        Authorization: `Bearer ${jwt}`
      }
    });
    expect(groupsResponse.status).toBe(200);
    const groups = groupsResponse.data;
    expect(Array.isArray(groups)).toBe(true);
    expect(groups).toContain(testUsername);  // This is the "self" group
    expect(groups).toContain('users');
  });

  test('/app/submit-csr - Submit and sign CSR', async () => {
    // Generate CSR
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const csr = forge.pki.createCertificationRequest();
    csr.publicKey = keys.publicKey;
    csr.setSubject([{ name: 'commonName', value: testUsername }]);
    // No extensions - the signer will add the group extension
    csr.sign(keys.privateKey);
    // Ensure proper PEM encoding with normalized line endings
    const pemCsr = forge.pki.certificationRequestToPem(csr)
      .replace(/\r\n/g, '\n');  // Convert all line endings to Unix format
    console.log('Generated CSR:', pemCsr);
    const submitResponse = await api.post('/app/submit-csr', {
      csr: pemCsr
    }, {
      headers: {
        Authorization: `Bearer ${jwt}`
      }
    });
    expect(submitResponse.status).toBe(200);
    expect(submitResponse.data).toHaveProperty('certificate');
    console.log('Resultant certificate:', submitResponse.data.certificate);
  }, 60000);

  // Security Tests
  test('/app/submit-csr - Unauthorized CSR submission', async () => {
    try {
      await api.post('/app/submit-csr', {
        csr: 'invalid-csr'
      });
    } catch (error) {
      expect(error.response.status).toBe(401);
    }
  });

  // Username Check - After certificate request
  test('/app/check-username/{username} - Check username availability after certificate request', async () => {
    console.log('Testing with username after certificate request:', testUsername);
    const response = await api.get(`/app/check-username/${testUsername}`);
    console.log('Username response after certificate request:', response.data);
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('available');
    expect(response.data.available).toBe(false);

    // Call backend API directly
    try {
      const backendResponse = await axios.get(`https://urp.ogt11.com/api/request/check-username/${testUsername}`);
      console.log('Backend API response:', JSON.stringify(backendResponse.data, null, 2));
    } catch (error) {
      console.error('Backend API call failed:', error.response?.data || error.message);
    }
  });
}); 

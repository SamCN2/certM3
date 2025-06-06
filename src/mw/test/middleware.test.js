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
  describe('Basic Health Check', () => {
    test('/health - Health check endpoint', async () => {
      const response = await api.get('/health');
      expect(response.status).toBe(200);
    });
  });

  describe('Certificate Request Flow', () => {
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
      if (!requestId) {
        throw new Error('Cannot validate email: No request ID from previous step');
      }
      console.log('Looking for validation email for username:', testUsername);
      challengeCode = await getChallengeCode(testUsername);
      console.log('Found challenge code:', challengeCode);
      const response = await api.post('/app/validate-email', {
        requestId: requestId,
        challengeToken: challengeCode
      });
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('token');
      jwt = response.data.token;
      console.log('Received JWT token:', jwt);
    });

    test('/app/submit-csr - Submit and sign CSR', async () => {
      if (!jwt) {
        throw new Error('Cannot submit CSR: No JWT token from previous step');
      }
      console.log('Starting CSR submission test with JWT:', jwt);
      const keys = forge.pki.rsa.generateKeyPair(2048);
      const csr = forge.pki.createCertificationRequest();
      csr.publicKey = keys.publicKey;
      csr.setSubject([{ name: 'commonName', value: testUsername }]);
      
      // Add custom username extension
      const usernameOid = '1.3.6.1.4.1.10049.1.2';
      const usernameExt = {
        id: usernameOid,
        critical: false,
        value: forge.util.encodeUtf8(testUsername)
      };
      
      // Add extension using the correct node-forge method
      csr.setAttributes([{
        name: 'extensionRequest',
        extensions: [usernameExt]
      }]);
      
      csr.sign(keys.privateKey);
      
      // Ensure proper PEM encoding with normalized line endings
      const pemCsr = forge.pki.certificationRequestToPem(csr)
        .replace(/\r\n/g, '\n');  // Convert all line endings to Unix format
      console.log('Generated CSR:', pemCsr);
      
      const response = await api.post('/app/submit-csr', {
        csr: pemCsr
      }, {
        headers: {
          'Authorization': `Bearer ${jwt}`
        }
      });
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('certificate');
    });
  });

  describe('Security Tests', () => {
    test('/app/submit-csr - Unauthorized CSR submission', async () => {
      console.log('Starting unauthorized test');
      try {
        await api.post('/app/submit-csr', {
          csr: 'invalid-csr'
        });
        // If we get here, the request succeeded when it should have failed
        throw new Error('Expected request to fail with 401');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });
}); 
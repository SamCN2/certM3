/**
 * Integration test suite for CertM3 app flow
 * This script simulates a real client interacting with the app via HTTP,
 * testing the full user flow: request → validate → user creation → CSR → certificate request.
 * 
 * Usage:
 * 1. Start all required services (API, App)
 * 2. Run: npx ts-node tests/test-routes.ts [--raw]
 *    --raw: Use localhost URLs instead of HTTPS
 */

import axios, { AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import forge from 'node-forge';

// Parse command line arguments
const useRaw = process.argv.includes('--raw');

// Service base URLs
const API_BASE_URL = useRaw ? 'http://localhost:3000/api' : 'https://urp.ogt11.com/api';
const APP_BASE_URL = useRaw ? 'http://localhost:3001' : 'https://urp.ogt11.com';

console.log(`Running tests in ${useRaw ? 'local development' : 'production'} mode`);
console.log(`API URL: ${API_BASE_URL}`);
console.log(`App URL: ${APP_BASE_URL}\n`);

// Test data
const TEST_REQUEST = {
  username: `testuser${Math.floor(Math.random() * 999999)}`.toLowerCase(),
  displayName: 'Request User',
  email: `testuser${Math.floor(Math.random() * 999999)}@testemail.com`.toLowerCase(),
};

// Helper function to read test email content
async function readTestEmail(username: string): Promise<string> {
  const emailDir = '/var/spool/certM3/test-emails';
  const files = await fs.promises.readdir(emailDir);
  const emailFile = files
    .filter(f => f.includes(username) && f.endsWith('-validation.txt'))
    .sort()
    .pop();
  
  if (!emailFile) {
    throw new Error(`No validation email found for ${username}`);
  }
  
  const emailPath = path.join(emailDir, emailFile);
  const emailContent = await fs.promises.readFile(emailPath, 'utf8');
  console.log('Email content:', emailContent);
  return emailContent;
}

// Helper function to extract validation link from email content
function extractValidationLink(emailContent: string): { requestId: string; challenge: string } {
  // Look for a URL containing /app/validate/{requestId}/{challenge}
  const urlMatch = emailContent.match(/https?:\/\/[^\s]+\/app\/validate\/([^\/]+)\/([^\s]+)/);
  if (!urlMatch) {
    throw new Error('Validation link not found in email');
  }
  const requestId = urlMatch[1];
  const challenge = urlMatch[2];
  return { requestId, challenge };
}

// Helper function to generate a CSR
function generateCSR(username: string): string {
  // Generate a new key pair
  const keys = forge.pki.rsa.generateKeyPair(2048);
  
  // Create a new CSR
  const csr = forge.pki.createCertificationRequest();
  csr.publicKey = keys.publicKey;
  csr.setSubject([{
    name: 'commonName',
    value: username
  }]);
  
  // Sign the CSR
  csr.sign(keys.privateKey);
  
  // Convert to PEM format
  return forge.pki.certificationRequestToPem(csr);
}

// Test username availability check
async function testUsernameCheck() {
  console.log('\nTesting username availability check...');
  
  // Test with a new username
  const newUsername = `testuser${uuidv4().slice(0, 8)}`;
  const response = await axios.get(`${APP_BASE_URL}/app/check-username/${newUsername}`);
  
  if (!response.data.success || !response.data.available) {
    throw new Error('Username check failed for new username');
  }
  console.log('✓ Username check passed for new username');
  
  // Test with an invalid username format
  try {
    await axios.get(`${APP_BASE_URL}/app/check-username/invalid@username`);
    throw new Error('Should have rejected invalid username format');
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      console.log('✓ Invalid username format rejected');
    } else {
      throw error;
    }
  }
}

// Test request form and submission
async function testRequestForm(username: string, email?: string) {
  console.log('\nTesting request form and submission...');
  console.log('Request data:', {
    username,
    email: email || `testuser${Math.floor(Math.random() * 999999)}@testemail.com`,
    displayName: 'Request User'
  });
  
  // Get the request form
  const formResponse = await axios.get(`${APP_BASE_URL}/app/request`);
  if (formResponse.status !== 200) {
    throw new Error('Failed to get request form');
  }
  console.log('✓ Request form retrieved');
  
  // Submit the request
  const requestData = {
    username,
    email: email || `testuser${Math.floor(Math.random() * 999999)}@testemail.com`,
    displayName: 'Request User'
  };
  const requestResponse = await axios.post(`${APP_BASE_URL}/app/request`, requestData, {
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (!requestResponse.data.success || !requestResponse.data.data?.requestId) {
    throw new Error('Request submission failed');
  }
  console.log('✓ Request submitted successfully');
  console.log('Response data:', requestResponse.data);
  
  // Now check if the username is taken
  const usernameCheckResponse = await axios.get(`${APP_BASE_URL}/app/check-username/${username}`);
  if (!usernameCheckResponse.data.success || usernameCheckResponse.data.available) {
    throw new Error('Username should be marked as taken after request submission');
  }
  console.log('✓ Username marked as taken after request submission');
  
  return requestResponse.data.data.requestId;
}

// Test validation flow
async function testValidation(requestId: string, isDirect: boolean, username: string) {
  console.log('\nTesting validation flow...');
  console.log('Validation data:', { requestId, isDirect, username });
  
  // Read validation email
  const emailContent = await readTestEmail(username);
  const { challenge } = extractValidationLink(emailContent);
  console.log('✓ Validation email read');
  console.log('Challenge:', challenge);
  
  if (isDirect) {
    // Test direct validation link
    const directValidateResponse = await axios.get(
      `${APP_BASE_URL}/app/validate/${requestId}/${challenge}`
    );
    
    if (!directValidateResponse.data.success || !directValidateResponse.data.data?.token) {
      throw new Error('Direct validation failed');
    }
    console.log('✓ Direct validation successful');
    console.log('Validation response:', directValidateResponse.data);
    return directValidateResponse.data.data.token;
  } else {
    // Test manual validation
    const manualValidateResponse = await axios.post(
      `${APP_BASE_URL}/app/validate`,
      { requestId, challenge },
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    if (!manualValidateResponse.data.success || !manualValidateResponse.data.data?.token) {
      throw new Error('Manual validation failed');
    }
    console.log('✓ Manual validation successful');
    console.log('Validation response:', manualValidateResponse.data);
    return manualValidateResponse.data.data.token;
  }
}

// Add certificate parsing helper
function parseCertificate(pem: string) {
  try {
    return forge.pki.certificateFromPem(pem);
  } catch (e) {
    const msg = (e instanceof Error) ? e.message : String(e);
    throw new Error('Failed to parse certificate: ' + msg);
  }
}

// Update testCertificateRequest to verify certificate subject and signature
async function testCertificateRequest(requestId: string, token: string, username: string) {
  console.log('\nTesting certificate request...');

  // Get certificate page
  const certPageResponse = await axios.get(
    `${APP_BASE_URL}/app/certificate?requestId=${requestId}&token=${token}`
  );
  if (certPageResponse.status !== 200) {
    throw new Error('Failed to get certificate page');
  }
  console.log('✓ Certificate page retrieved');

  // Generate and submit CSR
  const csr = generateCSR(username);
  const certResponse = await axios.post(
    `${APP_BASE_URL}/app/cert-sign`,
    { requestId, csr, password: 'test-password' },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }
  );

  if (!certResponse.data.success || !certResponse.data.data?.certificate) {
    throw new Error('Certificate signing failed');
  }
  console.log('✓ Certificate signed successfully');

  // Parse and verify certificate
  const certPem = certResponse.data.data.certificate;
  const caPem = certResponse.data.data.caCertificate;
  console.log('Returned Certificate PEM:', certPem);
  console.log('Returned CA Certificate PEM:', caPem);
  const cert = parseCertificate(certPem);
  const caCert = parseCertificate(caPem);

  // Check subject
  const subjectCN = cert.subject.getField('CN').value;
  if (subjectCN !== username) {
    throw new Error(`Certificate subject CN mismatch: expected ${username}, got ${subjectCN}`);
  }
  console.log('✓ Certificate subject matches username');

  // Verify certificate chain
  const caStore = forge.pki.createCaStore([caCert]);
  try {
    forge.pki.verifyCertificateChain(caStore, [cert]);
    console.log('✓ Certificate chain verified');
  } catch (e) {
    const msg = (e instanceof Error) ? e.message : String(e);
    throw new Error('Certificate chain verification failed: ' + msg);
  }
}

// Add new function to test certificate signing error cases
async function testCertificateSigningErrors(requestId: string, token: string) {
  console.log('\nTesting certificate signing error cases...');

  // Invalid CSR
  try {
    await axios.post(
      `${APP_BASE_URL}/app/cert-sign`,
      { requestId, csr: 'INVALID_CSR', password: 'test-password' },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    throw new Error('Should have rejected invalid CSR');
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      console.log('✓ Invalid CSR rejected');
    } else {
      throw error;
    }
  }

  // Invalid token
  const csr = generateCSR('testuser_invalidtoken');
  try {
    await axios.post(
      `${APP_BASE_URL}/app/cert-sign`,
      { requestId, csr, password: 'test-password' },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer invalidtoken`
        }
      }
    );
    throw new Error('Should have rejected invalid token');
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      console.log('✓ Invalid token rejected for certificate signing');
    } else {
      throw error;
    }
  }
}

// Test error cases
async function testErrorCases() {
  console.log('\nTesting error cases...');
  
  // Test invalid username format
  try {
    await axios.post(`${APP_BASE_URL}/app/request`, {
      ...TEST_REQUEST,
      username: 'invalid@username'
    });
    throw new Error('Should have rejected invalid username');
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      console.log('✓ Invalid username format rejected');
    } else {
      throw error;
    }
  }
  
  // Test invalid email format
  try {
    await axios.post(`${APP_BASE_URL}/app/request`, {
      ...TEST_REQUEST,
      email: 'invalid-email'
    });
    throw new Error('Should have rejected invalid email');
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      console.log('✓ Invalid email format rejected');
    } else {
      throw error;
    }
  }
  
  // Test invalid validation token
  try {
    await axios.get(`${APP_BASE_URL}/app/certificate?requestId=invalid&token=invalid`);
    throw new Error('Should have rejected invalid token');
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      console.log('✓ Invalid token rejected');
    } else {
      throw error;
    }
  }
}

// Test app endpoints
async function testAppEndpoints(requestId: string, token: string) {
  console.log('\nTesting app endpoints...');

  // Test /app/validate endpoint
  console.log('\nTesting /app/validate endpoint...');
  try {
    const validateResponse = await axios.get(`${APP_BASE_URL}/app/validate/${requestId}`);
    console.log('Response type:', validateResponse.headers['content-type']);
    console.log('Response status:', validateResponse.status);
    console.log('Response preview:', validateResponse.data.substring(0, 100) + '...');
  } catch (error) {
    console.error('Error testing /app/validate:', error);
  }

  // Test /app/certificate endpoint
  console.log('\nTesting /app/certificate endpoint...');
  try {
    const certResponse = await axios.get(`${APP_BASE_URL}/app/certificate?requestId=${requestId}&token=${token}`);
    console.log('Response type:', certResponse.headers['content-type']);
    console.log('Response status:', certResponse.status);
    console.log('Response preview:', certResponse.data.substring(0, 100) + '...');
  } catch (error) {
    console.error('Error testing /app/certificate:', error);
  }

  // Test /app/groups endpoint
  console.log('\nTesting /app/groups endpoint...');
  try {
    const groupsResponse = await axios.get(`${APP_BASE_URL}/app/groups/${requestId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Response type:', groupsResponse.headers['content-type']);
    console.log('Response status:', groupsResponse.status);
    console.log('Response data:', groupsResponse.data);
  } catch (error) {
    console.error('Error testing /app/groups:', error);
  }
}

// Modify the runTests function to include the new tests
async function runTests() {
  try {
    // Run existing tests
    await testUsernameCheck();
    const requestId = await testRequestForm(TEST_REQUEST.username, TEST_REQUEST.email);
    const token = await testValidation(requestId, true, TEST_REQUEST.username);
    await testCertificateRequest(requestId, token, TEST_REQUEST.username);
    await testCertificateSigningErrors(requestId, token);
    await testErrorCases();

    // Run new app endpoint tests
    await testAppEndpoints(requestId, token);

    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('\nTest suite failed:', error);
    process.exit(1);
  }
}

runTests(); 
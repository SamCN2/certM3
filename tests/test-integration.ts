/**
 * Integration test suite for CertM3 app flow
 * This script simulates a real client interacting with the app via HTTP,
 * testing the full user flow: request → validate → user creation → CSR → certificate request.
 * 
 * TODO: Increase test coverage for:
 * - Edge cases in certificate signing
 * - Concurrent request handling
 * - Session management
 * - Group membership edge cases
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
import assert from 'assert';

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

// OID definitions
const OID = {
  BASE: '1.3.6.1.4.1.10049', // webrelay arc
  GROUPS: '1.3.6.1.4.1.10049.1', // Groups extension
  USERNAME: '1.3.6.1.4.1.10049.2', // Username extension
};

// Test environment configuration
const TEST_CONFIG = {
  emailDir: process.env.TEST_EMAIL_DIR || '/var/spool/certM3/test-emails',
  cleanupAfterTests: process.env.TEST_CLEANUP !== 'false', // defaults to true
  maxRetries: parseInt(process.env.TEST_MAX_RETRIES || '3', 10),
  retryDelay: parseInt(process.env.TEST_RETRY_DELAY || '1000', 10), // ms
  rateLimitWindow: parseInt(process.env.TEST_RATE_LIMIT_WINDOW || '60', 10), // seconds
  rateLimitMax: parseInt(process.env.TEST_RATE_LIMIT_MAX || '10', 10), // requests per window
  jwtExpirationTime: parseInt(process.env.TEST_JWT_EXPIRATION || '3600', 10), // seconds
  testTimeout: parseInt(process.env.TEST_TIMEOUT || '300000', 10), // 5 minutes default
};

// Log test configuration
console.log('\nTest Configuration:');
console.log('Email Directory:', TEST_CONFIG.emailDir);
console.log('Cleanup After Tests:', TEST_CONFIG.cleanupAfterTests);
console.log('Max Retries:', TEST_CONFIG.maxRetries);
console.log('Retry Delay:', TEST_CONFIG.retryDelay, 'ms');
console.log('Rate Limit Window:', TEST_CONFIG.rateLimitWindow, 'seconds');
console.log('Rate Limit Max:', TEST_CONFIG.rateLimitMax, 'requests');
console.log('JWT Expiration:', TEST_CONFIG.jwtExpirationTime, 'seconds');
console.log('Test Timeout:', TEST_CONFIG.testTimeout, 'ms\n');

// Test state management
let testState = {
  createdUsers: new Set<string>(),
  createdRequests: new Set<string>(),
  testTokens: new Set<string>(),
};

// Setup function to ensure clean test environment
async function setupTestEnvironment() {
  console.log('\nSetting up test environment...');
  
  // Ensure email directory exists
  if (!fs.existsSync(TEST_CONFIG.emailDir)) {
    await fs.promises.mkdir(TEST_CONFIG.emailDir, { recursive: true });
  }
  
  // Clear any existing test emails
  const files = await fs.promises.readdir(TEST_CONFIG.emailDir);
  for (const file of files) {
    if (file.endsWith('-validation.txt')) {
      await fs.promises.unlink(path.join(TEST_CONFIG.emailDir, file));
    }
  }
  
  console.log('✓ Test environment setup complete');
}

// Teardown function to clean up after tests
async function teardownTestEnvironment() {
  if (!TEST_CONFIG.cleanupAfterTests) {
    return;
  }
  
  console.log('\nCleaning up test environment...');
  
  // Clean up test emails
  const files = await fs.promises.readdir(TEST_CONFIG.emailDir);
  for (const file of files) {
    if (file.endsWith('-validation.txt')) {
      await fs.promises.unlink(path.join(TEST_CONFIG.emailDir, file));
    }
  }
  
  console.log('✓ Test environment cleanup complete');
}

// Helper function to parse a certificate from PEM format
function parseCertificate(pem: string) {
  try {
    return forge.pki.certificateFromPem(pem);
  } catch (e) {
    const msg = (e instanceof Error) ? e.message : String(e);
    throw new Error('Failed to parse certificate: ' + msg);
  }
}

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
function generateCSR(username: string, displayName: string, groups: string[], email: string): string {
  // Generate a new key pair
  const keys = forge.pki.rsa.generateKeyPair(2048);
  
  // Create a new CSR
  const csr = forge.pki.createCertificationRequest();
  csr.publicKey = keys.publicKey;
  
  // Set subject
  csr.setSubject([
    { name: 'commonName', value: displayName },
    { name: 'organizationName', value: 'ogt11.com' },
    { name: 'organizationalUnitName', value: 'CertM3' },
    { name: 'localityName', value: 'City' },
    { name: 'stateOrProvinceName', value: 'State' },
    { name: 'countryName', value: 'US' },
    { name: 'emailAddress', value: email }
  ]);

  // Add extensions
  const extensions: any[] = [];

  // Add username as rfc822Name in SAN
  const emailDomain = email.split('@')[1];
  extensions.push({
    name: 'subjectAltName',
    altNames: [{
      type: 6, // rfc822Name
      value: `${username}@${emailDomain}`
    }]
  });

  // Add groups as a custom extension
  if (groups && groups.length > 0) {
    extensions.push({
      id: OID.GROUPS,
      name: 'groups',
      value: JSON.stringify({
        groups: groups
      })
    });
  }

  // Add username as a custom extension
  extensions.push({
    id: OID.USERNAME,
    name: 'username',
    value: username
  });

  // Set all extensions
  csr.setAttributes([{
    name: 'extensionRequest',
    extensions: extensions
  }]);
  
  // Sign the CSR
  csr.sign(keys.privateKey);
  
  // Convert to PEM format
  return forge.pki.certificationRequestToPem(csr);
}

// Helper function to validate certificate extensions
function validateCertificateExtensions(cert: forge.pki.Certificate, username: string, email: string, groups: string[]) {
  // Debug logging
  console.log('Certificate extensions:', cert.extensions.map(ext => ({
    name: ext.name,
    id: ext.id,
    value: ext.value
  })));

  // Check CN matches display name
  const cn = cert.subject.getField('CN')?.value;
  assert.strictEqual(cn, 'Request User', 'CN should match display name');

  // Check SAN contains email
  const sanExt = cert.extensions.find(ext => ext.name === 'subjectAltName');
  assert.ok(sanExt, 'Certificate should have SAN extension');
  const altNames = sanExt.altNames;
  assert.ok(altNames, 'SAN extension should have altNames');
  assert.ok(altNames.some((name: { value: string }) => name.value === email), 'SAN should contain email');

  // Check groups extension
  const groupsExt = cert.extensions.find(ext => ext.id === OID.GROUPS);
  assert.ok(groupsExt, 'Certificate should have groups extension');
  const certGroups = JSON.parse(groupsExt.value).groups;
  // All groups in certificate should be in the input groups
  assert.ok(certGroups.every((group: string) => groups.includes(group)), 
    'All groups in certificate should be in the input groups');

  // Check username extension
  const usernameExt = cert.extensions.find(ext => ext.id === OID.USERNAME);
  assert.ok(usernameExt, 'Certificate should have username extension');
  assert.strictEqual(usernameExt.value, username, 'Username extension should match');
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
async function testValidation(requestId: string, isDirect: boolean, username: string, email: string) {
  console.log('\nTesting validation flow...');
  console.log('Validation data:', { requestId, isDirect, username, email });
  
  // Read validation email
  const emailContent = await readTestEmail(username);
  const { challenge } = extractValidationLink(emailContent);
  console.log('✓ Validation email read');
  console.log('Challenge:', challenge);
  
  // Add delay between request and validation
  console.log('Waiting 1000ms before validation...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test manual validation (POST endpoint)
  try {
    const validateResponse = await axios.post(
      `${APP_BASE_URL}/app/validate`,
      { requestId, challenge },
      { 
        headers: { 'Content-Type': 'application/json' },
        maxRedirects: 0,  // Don't follow redirects
        validateStatus: (status) => status >= 200 && status < 400  // Accept redirects
      }
    );

    // Check for redirect and Authorization header
    if (validateResponse.status === 302) {
      const authHeader = validateResponse.headers['authorization'];
      if (!authHeader) {
        throw new Error('Missing Authorization header in redirect');
      }
      console.log('✓ Validation successful with redirect and Authorization header');
      return authHeader.replace('Bearer ', '');  // Return just the token
    } else {
      throw new Error('Expected redirect after validation');
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 302) {
        const authHeader = error.response.headers['authorization'];
        if (!authHeader) {
          throw new Error('Missing Authorization header in redirect');
        }
        console.log('✓ Validation successful with redirect and Authorization header');
        return authHeader.replace('Bearer ', '');  // Return just the token
      }
      // Print full error response for debugging
      console.log('\nValidation failed with error response:');
      console.log('Status:', error.response?.status);
      console.log('Headers:', error.response?.headers);
      console.log('Data:', error.response?.data);
      
      // Add debug output for failed validation
      console.log('\nTo debug this endpoint, try:');
      console.log(`curl -v -X POST ${APP_BASE_URL}/app/validate \\`);
      console.log(`  -H "Content-Type: application/json" \\`);
      console.log(`  -d '{"requestId":"${requestId}","challenge":"${challenge}"}'`);
    }
    throw error;
  }
}

// Test direct validation flow
async function testDirectValidation(requestId: string, username: string, email: string) {
  console.log('\nTesting direct validation flow...');
  console.log('Validation data:', { requestId, username, email });
  
  // Read validation email for this specific request
  const emailContent = await readTestEmail(username);
  const { challenge } = extractValidationLink(emailContent);
  console.log('✓ Validation email read');
  console.log('Challenge:', challenge);
  
  // Test direct validation link
  const directValidateResponse = await axios.post(
    `${APP_BASE_URL}/app/validate`,
    { requestId, challenge },
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  if (!directValidateResponse.data.success || !directValidateResponse.data.data?.token) {
    throw new Error('Direct validation failed');
  }
  
  console.log('✓ Direct validation successful');
  console.log('Validation response:', directValidateResponse.data);
  
  return directValidateResponse.data.data.token;
}

// Test certificate request
async function testCertificateRequest(requestId: string, token: string, username: string) {
  console.log('\nTesting certificate request...');

  // Get certificate page
  const certPageResponse = await axios.get(
    `${APP_BASE_URL}/app/certificate?requestId=${requestId}`,
    {
      headers: {
        'Accept': 'text/html',
        'Authorization': `Bearer ${token}`
      },
      validateStatus: (status) => status >= 200 && status < 400
    }
  );

  // Verify HTML response
  if (!certPageResponse.headers['content-type']?.includes('text/html')) {
    throw new Error('Expected HTML response from certificate page');
  }
  if (!certPageResponse.data.includes('<!DOCTYPE html>')) {
    throw new Error('Response does not contain HTML document');
  }
  if (!certPageResponse.data.includes('id="certificate-form"')) {
    throw new Error('Response does not contain certificate form');
  }
  console.log('✓ Certificate page retrieved with proper HTML');

  // Generate and submit CSR
  const csr = generateCSR(username, 'Request User', ['users', username], `${username}@testemail.com`);
  const certResponse = await axios.post(
    `${APP_BASE_URL}/app/certificate`,
    { requestId, csr, groupName: 'users' },
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
  if (subjectCN !== 'Request User') {
    throw new Error(`Certificate subject CN mismatch: expected Request User, got ${subjectCN}`);
  }
  console.log('✓ Certificate subject matches display name');

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
      `${APP_BASE_URL}/app/certificate`,
      { 
        requestId, 
        csr: 'INVALID_CSR', 
        groups: ['users']
      },
      {
        headers: {
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
  const csr = generateCSR('testuser_invalidtoken', 'Invalid User', ['users'], TEST_REQUEST.email);
  try {
    await axios.post(
      `${APP_BASE_URL}/app/certificate`,
      { 
        requestId, 
        csr,
        groups: ['users']
      },
      {
        headers: {
          'Authorization': 'Bearer invalid-token'
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
    const validateResponse = await axios.get(`${APP_BASE_URL}/app/validate/${requestId}`, {
      headers: {
        'Accept': 'text/html'
      }
    });
    console.log('Response type:', validateResponse.headers['content-type']);
    console.log('Response status:', validateResponse.status);
    console.log('Response preview:', validateResponse.data.substring(0, 100) + '...');
    if (validateResponse.headers['content-type']?.includes('text/html') && !validateResponse.data.includes('<!DOCTYPE html>')) {
      console.error('MISMATCH: Content-Type is text/html but response does not contain <!DOCTYPE html>');
    }
    console.log('\nTo debug this endpoint, try:');
    console.log(`curl -v -H "Accept: text/html" "${APP_BASE_URL}/app/validate/${requestId}"`);
  } catch (error) {
    console.error('Error testing /app/validate:', error);
    console.log('\nTo debug this endpoint, try:');
    console.log(`curl -v -H "Accept: text/html" "${APP_BASE_URL}/app/validate/${requestId}"`);
  }

  // Test /app/certificate endpoint
  console.log('\nTesting /app/certificate endpoint...');
  try {
    const certResponse = await axios.get(`${APP_BASE_URL}/app/certificate?requestId=${requestId}`, {
      headers: {
        'Accept': 'text/html',
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Response type:', certResponse.headers['content-type']);
    console.log('Response status:', certResponse.status);
    console.log('Response preview:', certResponse.data.substring(0, 100) + '...');

    // Verify content type
    if (!certResponse.headers['content-type']?.includes('text/html')) {
      console.error('MISMATCH: Expected text/html content type');
    }

    // Verify HTML structure
    if (!certResponse.data.includes('<!DOCTYPE html>')) {
      console.error('MISMATCH: Response does not contain <!DOCTYPE html>');
    }

    // Verify certificate form
    if (!certResponse.data.includes('id="certificate-form"')) {
      console.error('MISMATCH: Response does not contain certificate form');
    }

    // Verify groups are present and properly formatted
    const groupOptions = certResponse.data.match(/<option value="[^"]+">[^<]+<\/option>/g);
    if (!groupOptions || groupOptions.length === 0) {
      console.error('MISMATCH: No group options found in response');
    } else {
      console.log('Found group options:', groupOptions);
    }

    // Verify JWT validation
    try {
      // Try with invalid token
      await axios.get(`${APP_BASE_URL}/app/certificate?requestId=${requestId}`, {
        headers: {
          'Accept': 'text/html',
          'Authorization': 'Bearer invalid-token'
        }
      });
      console.error('MISMATCH: Should have rejected invalid token');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.log('✓ JWT validation working correctly');
      } else {
        console.error('MISMATCH: Unexpected error with invalid token:', error);
      }
    }

    // Verify requestId mismatch
    try {
      await axios.get(`${APP_BASE_URL}/app/certificate?requestId=invalid-id`, {
        headers: {
          'Accept': 'text/html',
          'Authorization': `Bearer ${token}`
        }
      });
      console.error('MISMATCH: Should have rejected mismatched requestId');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.log('✓ RequestId validation working correctly');
      } else {
        console.error('MISMATCH: Unexpected error with mismatched requestId:', error);
      }
    }

    console.log('\nTo debug this endpoint, try:');
    console.log(`curl -v -H "Accept: text/html" -H "Authorization: Bearer ${token}" "${APP_BASE_URL}/app/certificate?requestId=${requestId}"`);
  } catch (error) {
    console.error('Error testing /app/certificate:', error);
    console.log('\nTo debug this endpoint, try:');
    console.log(`curl -v -H "Accept: text/html" -H "Authorization: Bearer ${token}" "${APP_BASE_URL}/app/certificate?requestId=${requestId}"`);
  }
}

// Helper to get an available username and matching email
async function getAvailableUsernameAndEmail(): Promise<{username: string, email: string}> {
  while (true) {
    const username = `testuser${Math.floor(Math.random() * 999999)}`.toLowerCase();
    const email = `${username}@testemail.com`;
    try {
      const check = await axios.get(`${APP_BASE_URL}/app/check-username/${username}`);
      if (check.data.success && check.data.available) {
        return { username, email };
      }
    } catch (e) {
      // ignore and try again
    }
  }
}

// Security test functions
async function testRateLimiting() {
  console.log('\nTesting rate limiting...');
  
  const username = `testuser${uuidv4().slice(0, 8)}`;
  const requests = Array(TEST_CONFIG.rateLimitMax + 1).fill(null);
  
  // Make requests up to the limit
  for (let i = 0; i < TEST_CONFIG.rateLimitMax; i++) {
    try {
      await axios.get(`${APP_BASE_URL}/app/check-username/${username}`);
      console.log(`✓ Request ${i + 1} succeeded`);
    } catch (error) {
      throw new Error(`Rate limit test failed at request ${i + 1}`);
    }
  }
  
  // Try one more request - should be rate limited
  try {
    await axios.get(`${APP_BASE_URL}/app/check-username/${username}`);
    throw new Error('Rate limit not enforced');
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 429) {
      console.log('✓ Rate limit enforced correctly');
    } else {
      throw error;
    }
  }
}

async function testJWTExpiration() {
  console.log('\nTesting JWT expiration...');
  
  // Create a test request
  const { username, email } = await getAvailableUsernameAndEmail();
  const requestId = await testRequestForm(username, email);
  
  // Get validation token
  const token = await testValidation(requestId, false, username, email);
  
  // Wait for token to expire (assuming 1 hour expiration)
  console.log('Waiting for token to expire...');
  await new Promise(resolve => setTimeout(resolve, 3601000)); // 1 hour + 1 second
  
  // Try to use expired token
  try {
    await axios.get(
      `${APP_BASE_URL}/app/certificate?requestId=${requestId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    throw new Error('Expired token was accepted');
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      console.log('✓ Expired token rejected correctly');
    } else {
      throw error;
    }
  }
}

async function testInvalidTokens() {
  console.log('\nTesting invalid tokens...');
  
  const invalidTokens = [
    'invalid-token',
    'Bearer invalid-token',
    'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.invalid-signature'
  ];
  
  for (const token of invalidTokens) {
    try {
      await axios.get(
        `${APP_BASE_URL}/app/certificate?requestId=test`,
        {
          headers: {
            'Authorization': token
          }
        }
      );
      throw new Error(`Invalid token was accepted: ${token}`);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.log(`✓ Invalid token rejected: ${token}`);
      } else {
        throw error;
      }
    }
  }
}

async function testCSRFProtection() {
  console.log('\nTesting CSRF protection...');
  
  // Create a test request
  const { username, email } = await getAvailableUsernameAndEmail();
  const requestId = await testRequestForm(username, email);
  
  // Try to submit without CSRF token
  try {
    await axios.post(
      `${APP_BASE_URL}/app/request`,
      {
        username: `testuser${uuidv4().slice(0, 8)}`,
        email: `testuser${uuidv4().slice(0, 8)}@testemail.com`,
        displayName: 'Test User'
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    throw new Error('Request accepted without CSRF token');
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      console.log('✓ CSRF protection working correctly');
    } else {
      throw error;
    }
  }
}

// Update the main runTests function to include new tests
async function runTests() {
  try {
    await setupTestEnvironment();
    
    // Run existing tests
    await testUsernameCheck();
    const { username, email } = await getAvailableUsernameAndEmail();
    const requestId = await testRequestForm(username, email);
    const token = await testValidation(requestId, false, username, email);
    await testCertificateRequest(requestId, token, username);
    await testCertificateSigningErrors(requestId, token);
    await testErrorCases();
    await testAppEndpoints(requestId, token);
    
    // Run new security tests
    await testRateLimiting();
    await testJWTExpiration();
    await testInvalidTokens();
    await testCSRFProtection();
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('\nTest suite failed:', error);
    process.exit(1);
  } finally {
    await teardownTestEnvironment();
  }
}

runTests();

const axios = require('axios');
const { expect } = require('chai');
const { JSDOM } = require('jsdom');
const { spawn, execSync } = require('child_process');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

const BASE_URL = 'https://urp.ogt11.com';
let serverProcess;

before(async function() {
  this.timeout(30000); // Increase timeout to 30 seconds
  
  // Build the app
  console.log('Building app...');
  execSync('npm run build', { cwd: 'src/app', stdio: 'inherit' });
  
  // Start the server
  console.log('Starting server...');
  serverProcess = spawn('npm', ['start'], { 
    cwd: 'src/app',
    stdio: 'inherit'
  });
  
  // Wait for server to start
  let retries = 30; // Increase retries
  while (retries > 0) {
    try {
      await axios.get(BASE_URL);
      console.log('Server started successfully');
      break;
    } catch (err) {
      retries--;
      if (retries === 0) throw new Error('Server failed to start');
      await sleep(1000);
    }
  }
});

after(async () => {
  // Kill the server
  if (serverProcess) {
    serverProcess.kill();
    await sleep(1000); // Give it time to shut down
  }
});

// Helper to check if the server is running before tests
async function ensureServerRunning() {
  try {
    await axios.get(BASE_URL);
  } catch (err) {
    throw new Error('App server is not running at ' + BASE_URL + '. Please ensure the production server is available before running view tests.');
  }
}

describe('View Flow Tests', () => {
  let dom;

  before(async function() {
    this.timeout(5000);
    await ensureServerRunning();
  });

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    global.document = dom.window.document;
    global.window = dom.window;
  });

  describe('Request Form Flow', () => {
    it('should load request form and validate fields', async () => {
      // Get the request form page
      const response = await axios.get(`${BASE_URL}/app/request`);
      expect(response.status).to.equal(200);
      
      // Parse the HTML
      dom.window.document.body.innerHTML = response.data;
      
      // Check for required form elements
      const form = document.querySelector('#user-request-form');
      expect(form).to.exist;
      
      const usernameInput = form?.querySelector('input[name="username"]');
      expect(usernameInput).to.exist;
      expect(usernameInput?.getAttribute('required')).to.exist;
      expect(usernameInput?.getAttribute('pattern')).to.equal('[a-z0-9]+');
      
      const emailInput = form?.querySelector('input[name="email"]');
      expect(emailInput).to.exist;
      expect(emailInput?.getAttribute('required')).to.exist;
      expect(emailInput?.getAttribute('type')).to.equal('email');
      
      const displayNameInput = form?.querySelector('input[name="displayName"]');
      expect(displayNameInput).to.exist;
      expect(displayNameInput?.getAttribute('required')).to.exist;
      expect(displayNameInput?.getAttribute('minlength')).to.equal('2');
      expect(displayNameInput?.getAttribute('maxlength')).to.equal('64');
    });
  });

  describe('Validation Flow', () => {
    it('should load validation page with request ID', async () => {
      // First submit a request to get a requestId
      const requestResponse = await axios.post(`${BASE_URL}/app/request`, {
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User'
      });
      expect(requestResponse.data.success).to.be.true;
      const requestId = requestResponse.data.data.requestId;
      
      // Validate the request
      const validateResponse = await axios.post(`${BASE_URL}/app/validate/${requestId}`, {
        email: 'test@example.com'
      });
      expect(validateResponse.data.success).to.be.true;
      
      // Get the validation page
      const response = await axios.get(`${BASE_URL}/app/validate/${requestId}`);
      expect(response.status).to.equal(200);
      
      // Parse the HTML
      dom.window.document.body.innerHTML = response.data;
      
      // Check for validation form
      const form = document.querySelector('#validate-email-form');
      expect(form).to.exist;
      
      const emailInput = form?.querySelector('input[name="email"]');
      expect(emailInput).to.exist;
      expect(emailInput?.getAttribute('required')).to.exist;
      expect(emailInput?.getAttribute('type')).to.equal('email');
    });

    it('should show error for invalid request ID', async () => {
      const response = await axios.get(`${BASE_URL}/app/validate/invalid-id`);
      expect(response.status).to.equal(200);
      
      // Parse the HTML
      dom.window.document.body.innerHTML = response.data;
      
      // Check for error message
      const errorMessage = document.querySelector('.error.message');
      expect(errorMessage).to.exist;
      expect(errorMessage?.textContent).to.include('Invalid or expired request');
    });
  });

  describe('Certificate Flow', () => {
    it('should load certificate page with valid token', async () => {
      // First submit a request
      const requestResponse = await axios.post(`${BASE_URL}/app/request`, {
        username: 'testuser2',
        email: 'test2@example.com',
        displayName: 'Test User 2'
      });
      expect(requestResponse.data.success).to.be.true;
      const requestId = requestResponse.data.data.requestId;
      
      // Validate the request
      const validateResponse = await axios.post(`${BASE_URL}/app/validate`, {
        requestId,
        challenge: 'test-challenge'
      });
      expect(validateResponse.data.success).to.be.true;
      const token = validateResponse.data.data.token;
      
      // Get the certificate page
      const response = await axios.get(`${BASE_URL}/app/certificate?requestId=${requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      expect(response.status).to.equal(200);
      
      // Parse the HTML
      dom.window.document.body.innerHTML = response.data;
      
      // Check for certificate form
      const form = document.querySelector('#certificate-form');
      expect(form).to.exist;
      
      const passwordInput = form?.querySelector('input[name="password"]');
      expect(passwordInput).to.exist;
      expect(passwordInput?.getAttribute('required')).to.exist;
      expect(passwordInput?.getAttribute('type')).to.equal('password');
      
      const groupsSelect = form?.querySelector('#groups');
      expect(groupsSelect).to.exist;
    });

    it('should show error for invalid token', async () => {
      const response = await axios.get(`${BASE_URL}/app/certificate?requestId=test-id`, {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });
      expect(response.status).to.equal(401);
    });
  });
}); 
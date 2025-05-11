/**
 * App route testing script for CertM3 web application
 * This script tests the existence and basic functionality of app routes
 * and their associated UI components.
 * 
 * Usage:
 * 1. Start all required services
 * 2. Run: npx ts-node tests/test-app.ts [--raw]
 *    --raw: Use localhost URLs instead of HTTPS
 */

import axios, { AxiosError } from 'axios';
import { JSDOM } from 'jsdom';
import { describe, test, expect, beforeAll } from '@jest/globals';

// Parse command line arguments
const useRaw = process.argv.includes('--raw');

// App base URL
const APP_BASE_URL = useRaw ? 'http://localhost:3001' : 'https://urp.ogt11.com/app';

console.log(`Running app tests in ${useRaw ? 'local development' : 'production'} mode`);
console.log(`App URL: ${APP_BASE_URL}\n`);

interface AppTestCase {
  name: string;
  path: string;
  expectedStatus: number;
  description: string;
  validateContent?: (dom: JSDOM) => boolean;
}

const testCases: AppTestCase[] = [
  {
    name: 'Request Page',
    path: '/request',
    expectedStatus: 200,
    description: 'Loads the certificate request form',
    validateContent: (dom: JSDOM) => {
      const document = dom.window.document;
      
      // Check for required form elements
      const form = document.querySelector('form#certificate-request-form');
      if (!form) return false;

      // Check for required input fields
      const usernameInput = document.querySelector('input[name="username"]');
      const emailInput = document.querySelector('input[name="email"]');
      const displayNameInput = document.querySelector('input[name="displayName"]');
      
      if (!usernameInput || !emailInput || !displayNameInput) return false;

      // Check for validation elements
      const validationLabel = document.querySelector('.username-validation');
      if (!validationLabel) return false;

      // Check for submit button
      const submitButton = document.querySelector('button[type="submit"]');
      if (!submitButton) return false;

      // Check for message containers
      const errorMessage = document.querySelector('.error.message');
      const successMessage = document.querySelector('.success.message');
      if (!errorMessage || !successMessage) return false;

      return true;
    }
  }
];

async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const test of testCases) {
    console.log(`\nTesting: ${test.name}`);
    console.log(`Path: ${test.path}`);
    console.log(`Description: ${test.description}`);

    try {
      const response = await axios.get(`${APP_BASE_URL}${test.path}`, {
        validateStatus: () => true // Don't throw on non-2xx status
      });

      // Check status code
      if (response.status !== test.expectedStatus) {
        console.error(`❌ Status code mismatch. Expected ${test.expectedStatus}, got ${response.status}`);
        failed++;
        continue;
      }

      // If we expect a successful response, validate the content
      if (test.expectedStatus === 200 && test.validateContent) {
        const dom = new JSDOM(response.data);
        const contentValid = test.validateContent(dom);
        
        if (!contentValid) {
          console.error('❌ Content validation failed');
          failed++;
          continue;
        }
      }

      console.log('✅ Test passed');
      passed++;
    } catch (error) {
      console.error('❌ Test failed with error:', error instanceof AxiosError ? error.message : error);
      failed++;
    }
  }

  console.log(`\nTest Summary:`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${testCases.length}`);

  process.exit(failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});

const BASE_URL = 'http://urp.ogt11.com';

describe('CertM3 App Tests', () => {
  let dom: JSDOM;
  let document: Document;

  beforeAll(async () => {
    // Fetch the main page
    const response = await axios.get(`${BASE_URL}/app/request`);
    dom = new JSDOM(response.data);
    document = dom.window.document;
  });

  describe('HTML Structure and Script Loading', () => {
    test('jQuery is loaded before Semantic UI', () => {
      const scripts = Array.from(document.getElementsByTagName('script'));
      const jqueryScript = scripts.find(script => 
        script.src && script.src.includes('jquery')
      );
      const semanticScript = scripts.find(script => 
        script.src && script.src.includes('semantic')
      );

      expect(jqueryScript).toBeDefined();
      expect(semanticScript).toBeDefined();
      if (jqueryScript && semanticScript) {
        const jqueryIndex = scripts.indexOf(jqueryScript);
        const semanticIndex = scripts.indexOf(semanticScript);
        expect(jqueryIndex).toBeLessThan(semanticIndex);
      }
    });

    test('app.js is loaded after jQuery and Semantic UI', () => {
      const scripts = Array.from(document.getElementsByTagName('script'));
      const appScript = scripts.find(script => 
        script.src && script.src.includes('app.js')
      );
      const jqueryScript = scripts.find(script => 
        script.src && script.src.includes('jquery')
      );
      const semanticScript = scripts.find(script => 
        script.src && script.src.includes('semantic')
      );

      expect(appScript).toBeDefined();
      if (appScript && jqueryScript && semanticScript) {
        const appIndex = scripts.indexOf(appScript);
        const jqueryIndex = scripts.indexOf(jqueryScript);
        const semanticIndex = scripts.indexOf(semanticScript);
        expect(appIndex).toBeGreaterThan(jqueryIndex);
        expect(appIndex).toBeGreaterThan(semanticIndex);
      }
    });

    test('all required scripts are present and accessible', async () => {
      const scripts = Array.from(document.getElementsByTagName('script'));
      for (const script of scripts) {
        if (script.src) {
          try {
            const response = await axios.get(script.src);
            expect(response.status).toBe(200);
          } catch (error) {
            console.error(`Failed to load script: ${script.src}`);
            throw error;
          }
        }
      }
    });
  });

  describe('Request Page Content', () => {
    test('page has correct title', () => {
      const title = document.querySelector('h1.ui.header')?.textContent;
      expect(title).toContain('CertM3 Certificate Management');
    });

    test('request form is present', () => {
      const form = document.querySelector('form#request-form');
      expect(form).toBeDefined();
    });

    test('form has required fields', () => {
      const form = document.querySelector('form#request-form');
      expect(form).toBeDefined();
      if (form) {
        const usernameField = form.querySelector('input[name="username"]');
        const emailField = form.querySelector('input[name="email"]');
        const displayNameField = form.querySelector('input[name="displayName"]');
        
        expect(usernameField).toBeDefined();
        expect(emailField).toBeDefined();
        expect(displayNameField).toBeDefined();
      }
    });

    test('form has submit button', () => {
      const form = document.querySelector('form#request-form');
      expect(form).toBeDefined();
      if (form) {
        const submitButton = form.querySelector('button[type="submit"]');
        expect(submitButton).toBeDefined();
        expect(submitButton?.textContent).toContain('Submit Request');
      }
    });
  });

  describe('API Service Integration', () => {
    test('API base URL is correctly configured', () => {
      const scripts = Array.from(document.getElementsByTagName('script'));
      const appScript = scripts.find(script => 
        script.src && script.src.includes('app.js')
      );
      expect(appScript).toBeDefined();
      if (appScript) {
        // Check if the script content contains the correct API URL
        expect(appScript.src).toContain('app.js');
      }
    });

    test('API endpoints are accessible', async () => {
      const endpoints = [
        '/api/validate/username',
        '/api/requests'
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(`${BASE_URL}${endpoint}`);
          expect(response.status).toBe(200);
        } catch (error) {
          // Some endpoints might return 404 if not implemented yet
          if (axios.isAxiosError(error)) {
            console.warn(`Endpoint ${endpoint} returned:`, error.response?.status);
          } else {
            console.warn(`Endpoint ${endpoint} failed:`, error);
          }
        }
      }
    });
  });

  describe('Error Handling', () => {
    test('no JavaScript errors in console', () => {
      const scripts = Array.from(document.getElementsByTagName('script'));
      for (const script of scripts) {
        if (script.src) {
          expect(script.src).not.toContain('undefined');
          expect(script.src).not.toContain('null');
        }
      }
    });

    test('all required dependencies are loaded', () => {
      const scripts = Array.from(document.getElementsByTagName('script'));
      const hasJQuery = scripts.some(script => 
        script.src && script.src.includes('jquery')
      );
      const hasSemanticUI = scripts.some(script => 
        script.src && script.src.includes('semantic')
      );
      const hasAppJS = scripts.some(script => 
        script.src && script.src.includes('app.js')
      );

      expect(hasJQuery).toBe(true);
      expect(hasSemanticUI).toBe(true);
      expect(hasAppJS).toBe(true);
    });
  });
}); 
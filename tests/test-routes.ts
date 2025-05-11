/**
 * Top-level route testing script for CertM3 services
 * This script tests the existence and basic functionality of API endpoints
 * across all CertM3 services (API, Admin, App).
 * 
 * Usage:
 * 1. Start all required services
 * 2. Run: npx ts-node tests/test-routes.ts [--raw]
 *    --raw: Use localhost URLs instead of HTTPS
 */

import axios, {AxiosError} from 'axios';
import {v4 as uuidv4} from 'uuid';

// Parse command line arguments
const useRaw = process.argv.includes('--raw');

// Service base URLs
const API_BASE_URL = useRaw ? 'http://localhost:3000/api' : 'https://urp.ogt11.com/api';
const ADMIN_BASE_URL = useRaw ? 'http://localhost:3001' : 'https://urp.ogt11.com/admin';
const APP_BASE_URL = useRaw ? 'http://localhost:3002' : 'https://urp.ogt11.com/app';

console.log(`Running tests in ${useRaw ? 'local development' : 'production'} mode`);
console.log(`API URL: ${API_BASE_URL}`);
console.log(`Admin URL: ${ADMIN_BASE_URL}`);
console.log(`App URL: ${APP_BASE_URL}\n`);

// Test data
const TEST_GROUP = {
  name: `testgroup-${uuidv4().slice(0, 8)}`,
  displayName: 'Test Group',
  description: 'Test group description',
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const TEST_REQUEST = {
  username: `requser-${uuidv4().slice(0, 8)}`,
  displayName: 'Request User',
  email: `req-${uuidv4().slice(0, 8)}@example.com`,
};

interface TestCase {
  name: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  baseUrl: string;
  expectedStatus?: number;
  data?: any;
  description?: string;
}

const testCases: TestCase[] = [
  // User endpoints
  {
    name: 'Create user',
    method: 'POST',
    path: '/users',
    baseUrl: API_BASE_URL,
    data: null, // Will be set dynamically in runTests
    description: 'Creates a new user with unique username and email',
  },
  {
    name: 'List users',
    method: 'GET',
    path: '/users',
    baseUrl: API_BASE_URL,
    description: 'Lists all users',
  },
  {
    name: 'List active users',
    method: 'GET',
    path: '/users?status=active',
    baseUrl: API_BASE_URL,
    description: 'Lists only active users',
  },

  // Group endpoints
  {
    name: 'Create group',
    method: 'POST',
    path: '/groups',
    baseUrl: API_BASE_URL,
    data: TEST_GROUP,
    description: 'Creates a new group',
  },
  {
    name: 'List groups',
    method: 'GET',
    path: '/groups',
    baseUrl: API_BASE_URL,
    description: 'Lists all groups',
  },
  {
    name: 'Create users group',
    method: 'POST',
    path: '/groups',
    baseUrl: API_BASE_URL,
    data: {
      name: 'users',
      displayName: 'Users Group',
      description: 'Default users group',
    },
    expectedStatus: 409,
    description: 'Attempts to create the protected users group',
  },

  // Certificate endpoints
  {
    name: 'Create certificate',
    method: 'POST',
    path: '/certificates',
    baseUrl: API_BASE_URL,
    data: null, // Will be set dynamically in runTests
    description: 'Creates a new certificate',
  },
  {
    name: 'List certificates',
    method: 'GET',
    path: '/certificates',
    baseUrl: API_BASE_URL,
    description: 'Lists all certificates',
  },
  {
    name: 'List active certificates',
    method: 'GET',
    path: '/certificates?status=active',
    baseUrl: API_BASE_URL,
    description: 'Lists only active certificates',
  },
  {
    name: 'Create duplicate certificate',
    method: 'POST',
    path: '/certificates',
    baseUrl: API_BASE_URL,
    data: null, // Will be set dynamically in runTests
    expectedStatus: 409,
    description: 'Attempts to create a certificate with duplicate fingerprint',
  },

  // Request endpoints
  {
    name: 'Create request',
    method: 'POST',
    path: '/requests',
    baseUrl: API_BASE_URL,
    data: TEST_REQUEST,
    description: 'Creates a new request',
  },
  {
    name: 'List requests',
    method: 'GET',
    path: '/requests/search',
    baseUrl: API_BASE_URL,
    description: 'Lists all requests',
  },
  {
    name: 'List pending requests',
    method: 'GET',
    path: '/requests/search?status=pending',
    baseUrl: API_BASE_URL,
    description: 'Lists only pending requests',
  },
  {
    name: 'Create duplicate request',
    method: 'POST',
    path: '/requests',
    baseUrl: API_BASE_URL,
    data: TEST_REQUEST,
    expectedStatus: 409,
    description: 'Attempts to create a request with duplicate username',
  },

  // API Service endpoints
  {
    name: 'API: Get user by ID',
    method: 'GET' as const,
    path: '/users/01eeb5e0-dc0b-44cf-b322-c5541afb40e7',
    baseUrl: API_BASE_URL,
    expectedStatus: 200,
    description: 'Gets a specific user by ID'
  },
  {
    name: 'API: Get non-existent user',
    method: 'GET' as const,
    path: '/users/00000000-0000-0000-0000-000000000000',
    baseUrl: API_BASE_URL,
    expectedStatus: 404,
    description: 'Attempts to get a user that does not exist'
  },
  {
    name: 'API: Search users',
    method: 'GET' as const,
    path: '/users?status=active',
    baseUrl: API_BASE_URL,
    expectedStatus: 200,
    description: 'Search for active users'
  },

  // Admin Service endpoints (placeholder for future implementation)
  ...(useRaw ? [] : [
    {
      name: 'Admin: Health check',
      method: 'GET' as const,
      path: '/health',
      baseUrl: ADMIN_BASE_URL,
      expectedStatus: 200,
      description: 'Checks admin service health'
    },
    {
      name: 'App: Health check',
      method: 'GET' as const,
      path: '/health',
      baseUrl: APP_BASE_URL,
      expectedStatus: 200,
      description: 'Checks app service health'
    }
  ])
];

async function runTests() {
  console.log('Starting CertM3 route tests...\n');

  let createdUser: any = null;
  let createdGroup: any = null;
  let createdCertificate: any = null;
  let createdRequest: any = null;

  // Create test user data with unique username and email
  const TEST_USER = {
    username: `testuser-${uuidv4().slice(0, 8)}`,
    email: `test-${uuidv4().slice(0, 8)}@example.com`,
    displayName: 'Test User',
  };

  // Create test certificate data
  const TEST_CERTIFICATE = {
    serialNumber: uuidv4(),
    codeVersion: '1.0.0',
    username: TEST_USER.username,
    commonName: 'Test Certificate',
    email: TEST_USER.email,
    fingerprint: `fp-${uuidv4()}`,
    notBefore: new Date().toISOString(),
    notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
    status: 'active',
    userId: '', // This will be set after user creation
  };

  for (const test of testCases) {
    try {
      console.log(`Testing: ${test.name}`);
      if (test.description) {
        console.log(`Description: ${test.description}`);
      }
      console.log(`${test.method} ${test.baseUrl}${test.path}`);

      // Set dynamic test data
      if (test.name === 'Create user') {
        test.data = TEST_USER;
      } else if (test.name === 'Create certificate') {
        test.data = TEST_CERTIFICATE;
      } else if (test.name === 'Create duplicate certificate') {
        test.data = TEST_CERTIFICATE;
      }

      const response = await axios({
        method: test.method,
        url: `${test.baseUrl}${test.path}`,
        data: test.data,
        validateStatus: () => true, // Accept any status code
      });

      const status = response.status;
      const expectedStatus = test.expectedStatus || 200;
      
      if (status === expectedStatus) {
        console.log(`✅ Success: ${status} (Expected: ${expectedStatus})`);
      } else {
        console.log(`❌ Failed: ${status} (Expected: ${expectedStatus})`);
      }

      if (response.data) {
        console.log('Response:', JSON.stringify(response.data, null, 2));
        
        // Store created resources for dependent tests
        if (test.name === 'Create user') {
          createdUser = response.data;
          // Update TEST_CERTIFICATE with the created user's ID
          TEST_CERTIFICATE.userId = createdUser.id;
        } else if (test.name === 'Create group') {
          createdGroup = response.data;
        } else if (test.name === 'Create certificate') {
          createdCertificate = response.data;
        } else if (test.name === 'Create request') {
          createdRequest = response.data;
        }
      }
      console.log('---\n');
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error(`❌ Error testing ${test.name}:`, error.message);
      } else {
        console.error(`❌ Error testing ${test.name}:`, 'Unknown error occurred');
      }
      console.log('---\n');
    }
  }

  // Log created resources for debugging
  console.log('Created Resources:');
  console.log('User:', createdUser?.id);
  console.log('Group:', createdGroup?.name);
  console.log('Certificate:', createdCertificate?.serialNumber);
  console.log('Request:', createdRequest?.id);
}

runTests().catch(console.error); 
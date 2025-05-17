// Add polyfills for jsdom environment
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;
(global as any).setImmediate = (cb: Function, ...args: any[]) => setTimeout(cb, 0, ...args);

// Safely mock window.location.replace
Object.defineProperty(window, 'location', {
  value: {
    ...window.location,
    replace: jest.fn()
  },
  writable: true
});

import request from 'supertest';
import { app } from '../../server';
import path from 'path';
import fs from 'fs';
import { generateValidationToken } from '../../utils/jwt';

// Mock the JWT verification
jest.mock('../../utils/jwt', () => ({
  generateValidationToken: jest.fn().mockReturnValue('mock-token'),
  verifyValidationToken: jest.fn().mockReturnValue({ requestId: '123' })
}));

// Mock axios globally
jest.mock('axios', () => ({
  default: {
    get: jest.fn().mockResolvedValue({
      data: {
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiry: new Date().toISOString(),
        isExpired: false
      }
    }),
    post: jest.fn().mockResolvedValue({ status: 204 }),
    isAxiosError: jest.fn().mockReturnValue(true)
  },
  __esModule: true
}));

// Mock getRequestStatus globally
jest.mock('../../server', () => {
  const original = jest.requireActual('../../server');
  return {
    ...original,
    getRequestStatus: jest.fn()
  };
});

// Ensure the mock is applied before any tests run
beforeAll(() => {
  jest.spyOn(process, 'exit').mockImplementation((code) => { throw new Error(`process.exit: ${code}`); });
});

describe('View Endpoints', () => {
  // Test the root endpoint
  describe('GET /', () => {
    it('should return index.html', async () => {
      const response = await request(app)
        .get('/')
        .expect('Content-Type', /html/)
        .expect(200);

      // Read the expected index.html file
      const expectedHtml = fs.readFileSync(
        path.join(__dirname, '../../../../../static/index.html'),
        'utf8'
      );

      // Compare the response with the expected HTML
      expect(response.text).toBe(expectedHtml);
    });
  });

  // Test the request form endpoint
  describe('GET /app/request', () => {
    it('should return request.html', async () => {
      const response = await request(app)
        .get('/app/request')
        .expect('Content-Type', /html/)
        .expect(200);

      // Read the expected request.html file
      const expectedHtml = fs.readFileSync(
        path.join(__dirname, '../../../../../static/views/request.html'),
        'utf8'
      );

      // Compare the response with the expected HTML
      expect(response.text).toBe(expectedHtml);
    });
  });

  // Test the validation page endpoint
  describe('GET /app/validate', () => {
    it('should return validate.html', async () => {
      const response = await request(app)
        .get('/app/validate')
        .expect('Content-Type', /html/)
        .expect(200);

      // Read the expected validate.html file
      const expectedHtml = fs.readFileSync(
        path.join(__dirname, '../../../../../static/views/validate.html'),
        'utf8'
      );

      // Compare the response with the expected HTML
      expect(response.text).toBe(expectedHtml);
    });
  });

  // Test the certificate page endpoint
  describe('GET /app/certificate', () => {
    it('should return 400 when missing token and requestId', async () => {
      await request(app)
        .get('/app/certificate')
        .expect(400);
    });

    it('should return certificate.html with valid token and requestId', async () => {
      const response = await request(app)
        .get('/app/certificate?token=mock-token&requestId=123')
        .expect('Content-Type', /html/)
        .expect(200);

      // Read the expected certificate.html file
      const expectedHtml = fs.readFileSync(
        path.join(__dirname, '../../../../../static/views/certificate.html'),
        'utf8'
      );

      // Compare the response with the expected HTML
      expect(response.text).toBe(expectedHtml);
    });
  });

  // Test the validation link endpoint
  describe('GET /app/validate/:requestId/:challenge', () => {
    it('should redirect to certificate page on successful validation', async () => {
      const { getRequestStatus } = require('../../server');
      getRequestStatus.mockResolvedValue({ status: 'pending', expiry: new Date(), isExpired: false });
      const axios = require('axios').default;
      axios.post.mockResolvedValue({ status: 204 });

      const response = await request(app)
        .get('/app/validate/123/abc')
        .expect(302); // Expect redirect

      // Check the redirect location
      expect(response.header.location).toMatch(/^\/app\/certificate\?requestId=123&token=mock-token$/);
    });

    it('should return error JSON when request is expired', async () => {
      const { getRequestStatus } = require('../../server');
      getRequestStatus.mockResolvedValue({ status: 'pending', expiry: new Date(), isExpired: true });

      const response = await request(app)
        .get('/app/validate/123/abc')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: {
          statusCode: 400,
          name: 'ValidationError',
          message: 'Request has expired'
        }
      });
    });
  });
}); 
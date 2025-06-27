# CertM3 Middleware Test Harness

This directory contains TypeScript unit tests for the CertM3 middleware application. These tests are written in TypeScript and can be copied verbatim to the web application for client-side testing and validation.

## Purpose

- **Middleware Testing**: Comprehensive tests for all major middleware endpoints and functionality
- **Code Reusability**: TypeScript tests can be adapted for web app client-side testing
- **API Validation**: Ensures middleware endpoints work correctly before web integration
- **Development Reference**: Provides working examples of API calls and data structures

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure the environment file:
```bash
cp test.env .env
```

3. Edit `.env` with your configuration:
- Set the correct base URLs for your middleware and API
- Configure test user data
- Set up paths to your mTLS certificates and keys
- Configure CSR signing certificate and key paths

## Running Tests

To run all tests:
```bash
npm test
```

To run only middleware tests:
```bash
npm run test:mw
```

## Test Coverage

The test suite covers:
- Health check endpoint
- Username availability check
- Certificate request initiation
- Email validation
- CSR submission and signing
- Authentication and authorization

## Integration with Web App

These TypeScript tests serve as a foundation for web app testing:

1. **API Client Code**: The test code demonstrates proper API client implementation
2. **Data Structures**: Shows correct request/response formats
3. **Error Handling**: Examples of proper error handling patterns
4. **Authentication**: JWT and mTLS authentication patterns

### Reusing in Web App

The test code can be adapted for web app use by:
- Removing Node.js specific dependencies
- Adapting for browser environment
- Using web-compatible crypto libraries (WebCrypto API)
- Converting to client-side test framework (Jest, Vitest, etc.)

## Notes

- The test harness uses mTLS for secure communication - this is managed by nginx, we don't worry about this
- Test certificates and keys should be properly configured
- The email validation test uses a mock challenge token - in a real environment, you would need to implement email interception or mocking
- The CSR generation uses node-forge to create test CSRs 
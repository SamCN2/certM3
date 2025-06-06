# CertM3 Middleware Test Harness

This test harness is designed to test the CertM3 middleware application. It includes tests for all major endpoints and functionality.

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

## Notes

- The test harness uses mTLS for secure communication - this is managed by nginx, we don't worry about this
- Test certificates and keys should be properly configured
- The email validation test uses a mock challenge token - in a real environment, you would need to implement email interception or mocking
- The CSR generation uses node-forge to create test CSRs 
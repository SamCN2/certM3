# Frontend API Specification

This document describes the interaction between the frontend application and the CertM3 middleware API.

## Base URL

The middleware API is available at `/mw` on the server. All endpoints are relative to this base path.

## Authentication

All endpoints except `/health` require a JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Endpoints

### Health Check

```typescript
GET /health

Response: 200 OK
```

### Certificate Request Flow

#### 1. Initiate Request

```typescript
POST /app/initiate-request
Content-Type: application/json

{
  email: string;      // User's email address
  username: string;   // 3-32 chars, alphanumeric only
  displayName: string; // User's display name
}

Response: 200 OK
{
  id: string;  // Request ID for subsequent operations
}
```

#### 2. Validate Email

```typescript
POST /app/validate-email
Content-Type: application/json

{
  requestId: string;      // ID from initiate-request
  challengeToken: string; // Token from validation email
}

Response: 200 OK
{
  token: string;  // JWT token for subsequent operations
}
```

#### 3. Submit CSR

```typescript
POST /app/submit-csr
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  csr: string;  // PEM-encoded CSR
}

Response: 200 OK
{
  certificate: string;  // PEM-encoded signed certificate
}
```

## CSR Generation

The frontend should generate CSRs using the Web Crypto API or a compatible library like node-forge. The CSR should:

1. Use RSA (2048 bits) or ECDSA (P-256) for the key pair
2. Include the username as the CommonName
3. Include any required extensions (e.g., username extension)

Example using node-forge:
```typescript
import * as forge from 'node-forge';

function generateCSR(username: string): string {
  // Generate key pair
  const keys = forge.pki.rsa.generateKeyPair(2048);
  
  // Create CSR
  const csr = forge.pki.createCertificationRequest();
  csr.publicKey = keys.publicKey;
  csr.setSubject([{ name: 'commonName', value: username }]);
  
  // Add custom username extension
  const usernameOid = '1.3.6.1.4.1.10049.1.2';
  const usernameExt = {
    id: usernameOid,
    critical: false,
    value: forge.util.encodeUtf8(username)
  };
  
  // Add extension using the correct method
  csr.setAttributes([{
    name: 'extensionRequest',
    extensions: [usernameExt]
  }]);
  
  // Sign the CSR
  csr.sign(keys.privateKey);
  
  // Convert to PEM
  return forge.pki.certificationRequestToPem(csr)
    .replace(/\r\n/g, '\n')  // Normalize line endings
    .replace(/\n/g, '\r\n'); // Convert to Windows line endings
}
```

## Error Handling

The API uses standard HTTP status codes:
- 200: Success
- 400: Bad Request (invalid input)
- 401: Unauthorized (missing or invalid JWT)
- 500: Internal Server Error

Error responses include a plain text message describing the error.

## CORS

The API supports CORS with the following headers:
- Access-Control-Allow-Origin: *
- Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
- Access-Control-Allow-Headers: DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization
- Access-Control-Expose-Headers: Content-Length,Content-Range

## Security Considerations

1. All sensitive operations require a valid JWT token
2. CSRs must be properly signed
3. The username extension must match the CommonName
4. Email validation is required before CSR submission
5. Rate limiting may be applied to prevent abuse 
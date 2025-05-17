# CertM3 Application Flow

This document outlines the complete flow of the CertM3 application, from initial request to certificate delivery, including all interactions between the app server and the API.

## 1. Request Creation Flow

### Client → App Server → API
```
Browser → App Server → API
POST /app/request
  ├─ Validate input (email, username)
  ├─ Check username availability
  │  └─ GET /api/request/check-username/{username}
  └─ Create request
     └─ POST /api/requests
```

**Request Body**:
```json
{
  "username": "string",
  "email": "string",
  "displayName": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "requestId": "string",
    "message": "Please check your email for validation instructions"
  }
}
```

## 2. Request Validation Flow

### Client → App Server → API
```
Browser → App Server → API
POST /app/validate
  └─ Validate request
     └─ POST /api/requests/{requestId}/validate
```

**Request Body**:
```json
{
  "requestId": "string",
  "challenge": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "token": "JWT_TOKEN",
    "redirect": "/app/certificate?requestId={requestId}&token={token}"
  }
}
```

## 3. Certificate Generation Flow

### Client → App Server → API
```
Browser → App Server → API
GET /app/certificate
  ├─ Verify JWT token
  └─ Serve certificate.html

POST /app/cert-sign
  ├─ Verify JWT token
  ├─ Get request details
  │  └─ GET /api/requests/{requestId}
  ├─ Verify user exists
  │  └─ GET /api/users?username={username}
  └─ Create certificate
     └─ POST /api/certificates
```

**Certificate Signing Request Body**:
```json
{
  "requestId": "string",
  "csr": "string",
  "password": "string"
}
```

**Certificate Creation API Request**:
```json
{
  "csr": "string",
  "userId": "string",
  "username": "string",
  "email": "string",
  "displayName": "string",
  "status": "active"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "certificate": "string",
    "privateKey": "string",
    "password": "string"
  }
}
```

## 4. Client-Side Certificate Processing

1. **CSR Generation**:
   - Client generates key pair using Web Crypto API
   - Client creates CSR using the private key
   - Client sends CSR to app server for signing

2. **Certificate Reception**:
   - Client receives signed certificate from app server
   - Client creates PKCS#12 bundle using:
     - Signed certificate
     - Private key
     - User-provided password

3. **Certificate Delivery**:
   - Client creates downloadable PKCS#12 bundle
   - Browser triggers download of certificate.p12

## 5. Error Handling

### App Server Error Responses
```json
{
  "success": false,
  "error": "Error message"
}
```

### Common Error Scenarios
1. **Invalid Input**:
   - Invalid email format
   - Invalid username format
   - Username already taken

2. **Authentication Errors**:
   - Missing token
   - Invalid token
   - Token mismatch with requestId

3. **API Errors**:
   - User not found
   - Request not found
   - Certificate signing failed

## 6. Security Considerations

1. **JWT Token Usage**:
   - Tokens are generated after successful validation
   - Tokens contain requestId for verification
   - Tokens are verified before serving certificate page
   - Tokens are verified before certificate signing

2. **API Protection**:
   - API endpoints are not directly exposed to clients
   - All API calls are proxied through app server
   - Input validation occurs at app server level
   - Consistent error handling and response format

3. **Certificate Security**:
   - Private keys never leave the client
   - CSRs are generated on the client side
   - Certificates are signed by the API
   - PKCS#12 bundles are created on the client side
   - Passwords are provided by the user and never stored

## 7. Database Impact

1. **Request Creation**:
   - Creates new record in requests table
   - Sets initial status as 'pending'

2. **Request Validation**:
   - Updates request status to 'validated'
   - Creates new user record
   - Establishes user-group relationships

3. **Certificate Creation**:
   - Creates new record in certificates table
   - Links certificate to user via userId
   - Sets initial status as 'active'
   - Maintains audit trail 
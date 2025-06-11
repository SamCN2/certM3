# CertM3 Frontend Specification

## Overview
The CertM3 frontend is a browser-based application that provides a secure interface for certificate management. It's built as a TypeScript application with all business logic contained within the browser, using `node-forge` for cryptographic operations.

## Core Features

1. **Certificate Request Flow**
   - Initial request form with:
     * Username field (with real-time availability checking)
     * Display name field
     * Email address field
   - Email validation view (two paths)
   - Certificate generation view with:
     * Passphrase input
     * Key pair generation
     * CSR creation
     * Group selection from available groups
   - Certificate Details View with:
     * Success message
     * Download link for PKCS12 package
     * Basic certificate information (subject, issuer, validity dates)
     * Option to view full certificate details
   - Certificate download as PKCS12 package

2. **Security Features**
   - Client-side key generation
   - Passphrase-based key protection
   - JWT-based authentication
   - Secure API communication
   - PKCS12 package generation

## Technical Stack

1. **Core Technologies**
   - TypeScript for type safety
   - `node-forge` for cryptographic operations
   - `axios` for API communication

2. **Key Dependencies**
   - `node-forge` for cryptographic operations
   - `axios` for API communication

## Application Structure

```
src/
├── core/
│   ├── types.ts      # TypeScript interfaces and types
│   ├── api.ts        # API communication
│   └── crypto.ts     # Cryptographic operations
```

## API Integration

The frontend communicates with the middleware through these endpoints:

1. `/app/initiate-request` (POST)
   - Submit initial request with username, email, display name
   - Returns request ID

2. `/app/validate-email` (POST)
   - Submit validation code
   - Returns JWT token

3. `/app/submit-csr` (POST)
   - Submit CSR with JWT authentication and selected groups
   - Returns signed certificate

4. `/app/check-username/{username}` (GET)
   - Check username availability
   - Used for real-time validation

5. `/app/groups` (GET)
   - Get list of available groups
   - Returns array of group objects with:
     * id: string
     * name: string
     * description: string

## User Flow

### Path 1 - Email Link (User-Friendly)
1. User enters username (with real-time availability check)
2. User submits initial request with email and display name
3. User receives validation email with link
4. User clicks link in email
5. System validates automatically and redirects to certificate generation
6. System fetches available groups from middleware
7. User enters passphrase
8. User selects groups from available options
9. System generates key pair and CSR
10. System submits CSR with selected groups and receives signed certificate
11. System creates PKCS12 package
12. System displays Certificate Details View with:
    * Success message
    * Download link for PKCS12 package
    * Basic certificate information
    * Option to view full details
13. User downloads PKCS12 package
14. System securely wipes sensitive data from memory

### Path 2 - Manual Validation (Testing-Friendly)
1. User enters username (with real-time availability check)
2. User submits initial request with email and display name
3. System redirects to validation view
4. User enters challenge code from email
5. User submits validation form
6. System validates and redirects to certificate generation
7. System fetches available groups from middleware
8. User enters passphrase
9. User selects groups from available options
10. System generates key pair and CSR
11. System submits CSR with selected groups and receives signed certificate
12. System creates PKCS12 package
13. System displays Certificate Details View with:
    * Success message
    * Download link for PKCS12 package
    * Basic certificate information
    * Option to view full details
14. User downloads PKCS12 package
15. System securely wipes sensitive data from memory

## Security Model

### Private Key Security
- Generated in browser using `forge.pki.rsa.generateKeyPair(2048)`
- NEVER transmitted to server
- ONLY used locally for:
  * Signing the CSR
  * Creating the PKCS12 package
- Stored only in memory during the session
- Discarded after PKCS12 creation

### Passphrase Security
- Only used for PKCS12 package creation
- Never stored or transmitted
- Only exists in memory during PKCS12 creation
- User's responsibility to remember it
- We don't even log that it was used

### Server Communication
What We Send to Server:
- CSR (contains public key only)
- JWT for authentication
- Username/email for identification
- Selected groups for certificate

What We Get Back:
- Signed certificate
- Available groups list
- No private key operations

## Implementation Details

### Cryptographic Operations
1. Key Pair Generation
   ```typescript
   const keys = forge.pki.rsa.generateKeyPair(2048);
   ```

2. CSR Creation
   ```typescript
   const csr = forge.pki.createCertificationRequest();
   csr.publicKey = publicKey;
   csr.setSubject([{ name: 'commonName', value: username }]);
   csr.sign(privateKey);
   ```

3. PKCS12 Creation
   ```typescript
   const p12 = forge.pkcs12.toPkcs12Asn1(
     privateKey,
     [certificate],
     passphrase
   );
   ```

### Group Management
1. Group Types
   ```typescript
   interface Group {
     id: string;
     name: string;
     description: string;
   }
   ```

2. Group Selection
   - Fetch groups from middleware on certificate view load
   - Store selected groups in state
   - Include selected groups in CSR submission
   - Validate that required groups are selected

### State Management
The application maintains state for:
- Current step in the process
- Request ID
- JWT token
- User information
- Error states
- Cryptographic data (temporary)
- Available groups
- Selected groups

### Error Handling
- API communication errors
- Cryptographic operation errors
- Validation errors
- User input errors
- Group selection validation

## Build and Deployment

1. **Development**
   - TypeScript compilation
   - Source maps for debugging
   - Development server

2. **Production**
   - TypeScript compilation
   - Asset optimization
   - Static file serving

3. **Deployment Options**
   - Root path (/)
   - Subpath (/certm3)
   - Configurable base URL 

### Certificate Details View
The Certificate Details View provides a comprehensive summary of the generated certificate and next steps:

1. **Success Message**
   - Clear indication that certificate generation was successful
   - Brief explanation of next steps

2. **Download Section**
   - Download link for PKCS12 package
   - Instructions for using the certificate
   - Warning about passphrase importance

3. **Certificate Information**
   - Basic Details:
     * Subject (username)
     * Issuer
     * Validity period (start/end dates)
     * Serial number
   - Full Details (expandable):
     * All certificate fields
     * Extensions
     * Signature algorithm
     * Public key details

4. **Actions**
   - Download PKCS12 package
   - View full certificate details

5. **Security Considerations**
   - Sensitive data is wiped from memory after download
   - No sensitive data is stored in the browser
   - Clear instructions for secure storage of PKCS12 package 
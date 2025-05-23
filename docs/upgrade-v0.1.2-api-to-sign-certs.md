# Certificate Signing API Implementation Plan (v0.1.2)

## Overview

This document outlines the plan to move certificate signing functionality from the app layer (`/app/certificate`) to the API layer (`/api/certificates/sign`). This change improves security by ensuring sensitive operations are handled by the API rather than the middleware layer, while maintaining the critical security principle that private keys are generated and stored only in the user's browser.

## Current Architecture

Currently, certificate signing is handled in the app layer:
- `/app/certificate` endpoints handle certificate generation and signing
- The app layer has direct access to signing keys and certificate generation logic
- Group membership validation is handled separately from the signing process
- Private keys are generated and stored in the user's browser

## Target Architecture

The new architecture will:
- Move certificate signing to `/api/certificates/sign`
- Handle group membership validation during the signing process
- Keep sensitive operations (certificate signing) in the API layer
- Maintain a clear separation between app and API responsibilities
- CRITICAL: Private key generation and storage remains exclusively in the user's browser

## Implementation Steps

### 1. API Layer Changes

1. Create new certificate signing endpoint:
   ```typescript
   POST /api/certificates/sign
   ```
   - Implement request validation
   - Add group membership verification
   - Move certificate signing logic from app to API
   - NEVER handle private key generation or storage

2. Update existing certificate endpoints:
   - Modify `/api/certificates` POST to handle certificate record creation only
   - Update response schemas and error handling
   - Add proper validation for certificate records

### 2. App Layer Changes

1. Update certificate generation flow:
   - Keep private key generation in the browser
   - Remove certificate signing logic from app layer
   - Add new API client methods for certificate signing
   - Update UI to handle new API responses
   - Ensure private keys never leave the browser

2. Modify certificate request handling:
   - Update request validation
   - Add group membership collection
   - Implement proper error handling for API responses
   - Maintain browser-based key management

### 3. Security Enhancements

1. Key Management:
   - Ensure private keys are generated and stored only in the browser
   - Implement proper key rotation mechanisms in the browser
   - Add audit logging for certificate operations
   - NEVER store or transmit private keys

2. Access Control:
   - Add proper authorization checks
   - Implement rate limiting for signing requests
   - Add request validation for group membership
   - Verify that private keys remain in the browser

### 4. Testing Plan

1. Unit Tests:
   - Test new API endpoints
   - Verify group membership validation
   - Test error handling and edge cases
   - Verify private keys never leave the browser

2. Integration Tests:
   - Test end-to-end certificate generation flow
   - Verify group membership integration
   - Test error scenarios and recovery
   - Verify browser-based key management

3. Security Tests:
   - Verify no private key storage in API
   - Test authorization mechanisms
   - Validate audit logging
   - Penetration testing for key security

### 5. Migration Strategy

1. Phase 1: Development
   - Implement new API endpoints
   - Update app layer code
   - Add comprehensive tests
   - Verify browser-based key management

2. Phase 2: Testing
   - Deploy to staging environment
   - Run integration tests
   - Perform security review
   - Verify no private key exposure

3. Phase 3: Deployment
   - Deploy API changes
   - Deploy app changes
   - Monitor for issues
   - Monitor for any private key exposure

4. Phase 4: Cleanup
   - Remove old certificate signing code
   - Update documentation
   - Archive old endpoints
   - Verify no private key handling in removed code

## API Changes

### New Endpoint

```typescript
POST /api/certificates/sign
Request:
{
  userId: string;      // UUID
  username: string;
  email: string;
  commonName: string;
  groupNames: string[];  // Array of group names (strings)
  notBefore?: string;  // ISO date
  notAfter?: string;   // ISO date
  // Note: Private key is generated and stored in browser only
}

Response:
{
  certificate: string; // PEM format
  // Note: Private key is never returned by the API
}
```

### Updated Endpoint

```typescript
POST /api/certificates
Request:
{
  serialNumber: string;    // UUID
  codeVersion: string;
  username: string;
  userId: string;         // UUID
  commonName: string;
  email: string;
  fingerprint: string;
  notBefore: string;      // ISO date
  notAfter: string;       // ISO date
}
```

## Error Handling

The new implementation will handle the following error cases:

1. Invalid Requests:
   - Missing required fields
   - Invalid UUID formats
   - Invalid date ranges
   - Attempts to send private keys

2. Authorization Errors:
   - User not authorized to request certificate
   - Invalid group membership
   - Rate limit exceeded

3. System Errors:
   - Signing failures
   - Database errors
   - Browser key generation failures

## Rollback Plan

In case of issues, the following rollback steps will be taken:

1. Revert API changes:
   - Restore old certificate endpoints
   - Remove new signing endpoint
   - Verify no private key handling

2. Revert app changes:
   - Restore old certificate generation code
   - Update API client code
   - Ensure browser-based key management

3. Verify functionality:
   - Run integration tests
   - Check certificate generation
   - Verify group membership
   - Verify private key security

## Success Criteria

The implementation will be considered successful when:

1. All certificate signing is handled by the API
2. Group membership is properly validated
3. All tests pass
4. No security vulnerabilities are found
5. Performance meets or exceeds current metrics
6. Documentation is complete and accurate
7. Private keys are generated and stored exclusively in the browser
8. No private keys are ever transmitted to or stored by the API

## Group Storage in Certificates

### OID Structure
We will store group membership information in the certificate's subjectDirectoryAttributes extension (2.5.29.9) using our private enterprise number:

```
Base OID: 1.3.6.1.4.1.10049
Structure:
- 1.3.6.1.4.1.10049.1 (apps)
  - 1.3.6.1.4.1.10049.1.1 (certM3)
    - 1.3.6.1.4.1.10049.1.1.1 (sdaGroups)
```

### Implementation Notes
1. Group storage will be implemented in a separate phase after the basic certificate signing is working
2. The **API (signer) is solely responsible for inserting the group list** into the certificate at signing time, based on authoritative group membership records. The client/browser does NOT include group information in the CSR.
3. Groups will be stored as a SEQUENCE of UTF8Strings in the subjectDirectoryAttributes extension
4. The extension cannot be marked critical (per RFC)
5. Group validation and lookup are performed by the API during certificate signing
6. These are private certificates for our implementation only

### Example Certificate Structure
```asn1
subjectDirectoryAttributes    OBJECT IDENTIFIER ::= { 2.5.29.9 }
    SEQUENCE {
        SEQUENCE {
            OBJECT IDENTIFIER { 1.3.6.1.4.1.10049.1.1.1 }
            SET {
                SEQUENCE {
                    OBJECT IDENTIFIER { 1.3.6.1.4.1.10049.1.1.1 }
                    SEQUENCE OF UTF8String {
                        "admin",
                        "users",
                        "auditors"
                    }
                }
            }
        }
    }
```

### Implementation Flow Correction
- The browser generates the keypair and creates a CSR (without group info in subjectDirectoryAttributes).
- The CSR is sent to the API for signing.
- The API looks up the user's group memberships (based on its own records).
- The API inserts the subjectDirectoryAttributes extension with the authoritative group list (using our OID, as a SEQUENCE OF UTF8String, each string being a group name).
- The API signs the certificate and returns it to the user.
- The private key never leaves the browser.

### Future Considerations
1. Need to define a more structured format for group storage
2. May need to handle group hierarchies
3. Consider adding group metadata (e.g., roles, permissions)
4. Plan for group updates and certificate reissuance
5. Consider adding timestamp of when groups were added to the certificate 
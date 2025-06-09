Specification Mapping Document
1. Core Responsibilities
| Requirement | Current Implementation | Status | Notes |
|-------------|----------------------|---------|-------|
| Serve static files | Not implemented | ❌ | Need to implement static file serving |
| JWT validation | Partially implemented | ⚠️ | Basic validation exists but needs error handling |
| API request proxying | Not implemented | ❌ | Need to implement API proxying |
| Basic SPA routing | Not implemented | ❌ | Need to implement routing |
2. Security Boundaries
| Requirement | Current Implementation | Status | Notes |
|-------------|----------------------|---------|-------|
| Never handle private keys | Correctly implemented | ✅ | No private key handling in middleware |
| Never store private keys | Correctly implemented | ✅ | No private key storage in middleware |
| Never handle passwords | Correctly implemented | ✅ | No password handling in middleware |
| JWT token validation | Partially implemented | ⚠️ | Basic validation exists but needs error handling |
3. Certificate Signing Flow
| Requirement | Current Implementation | Status | Notes |
|-------------|----------------------|---------|-------|
| Receive CSR from frontend | Correctly implemented | ✅ | CSR received in request body |
| Validate JWT token | Partially implemented | ⚠️ | Basic validation exists |
| Check request status | Partially implemented | ⚠️ | Basic status check exists |
| Forward to signer | Partially implemented | ⚠️ | Basic forwarding exists |
| Return signed certificate | Correctly implemented | ✅ | Returns both cert and CA cert |
4. Group Handling
| Requirement | Current Implementation | Status | Notes |
|-------------|----------------------|---------|-------|
| Get groups from API | Partially implemented | ⚠️ | Basic API call exists |
| Ensure "users" group | Correctly implemented | ✅ | Always includes "users" group |
| Ensure self-group | Correctly implemented | ✅ | Always includes username group |
| Pass groups to signer | Correctly implemented | ✅ | Groups passed to signer |
5. Error Handling
| Requirement | Current Implementation | Status | Notes |
|-------------|----------------------|---------|-------|
| Standard error responses | Partially implemented | ⚠️ | Basic error structure exists |
| Input validation | Partially implemented | ⚠️ | Basic validation exists |
| API error handling | Not implemented | ❌ | Need to implement API error handling |
| Logging | Partially implemented | ⚠️ | Basic logging exists |
6. API Integration
| Requirement | Current Implementation | Status | Notes |
|-------------|----------------------|---------|-------|
| Request status check | Partially implemented | ⚠️ | Basic status check exists |
| User group retrieval | Partially implemented | ⚠️ | Basic group retrieval exists |
| Certificate metadata storage | Not implemented | ❌ | Need to implement metadata storage |
| Error handling | Not implemented | ❌ | Need to implement API error handling |

7. Missing or Incomplete Features
Static file serving  -  NO.  We only receive and emit JSON messages.  Nginx handles files.
API request proxying -  NO.  We receive info from the frontend via mw-frontend API, and talk to backend via backend API.  We don't merely proxy, except for the check-username.  That's just to obvious.  Must proxy theat.
SPA routing  - Yes, you're driving an SPA-PWA app. you're the backend to it.  You're the fronend to the backend api.
Comprehensive error handling - Of couse
Certificate metadata storage - This is handled by the backend API.  Just use that as is.
API error handling - Error logs in /var/spool/certM3/logs
Comprehensive logging - Yes, as above.
Metrics collection
8. Security Concerns
JWT validation needs more robust error handling  - YES
API error handling needs implementation  - Only for the mw api.  the backend api is finished.
Request validation needs strengthening   - two things to remember:   1) requests are unauthenticated.  we build up auth by associating a reuest ID with a challenge, and those two coupled to validate the email addres, are really all we have.  2) We take those three together as the basis of the JWT, which ties together the steps of the certificate request process.  
Logging needs enhancement for security events  - OK
9. Next Steps
Implement missing core responsibilities  - YES  Oh my YES.
Enhance error handling
Implement API integration
Add comprehensive logging
Implement metrics collection
Add security event logging
Implement certificate metadata storage
Add API error handling

# certM3 Design Document

## System Overview
certM3 is a certificate management system consisting of three main components:
1. API Service (Loopback4)
2. Request Service (Express)
3. Admin Service (Express)

## Architecture

### Components
1. **API Service** (`/api`)
   - Loopback4 application
   - Manages user requests, user groups, and certificate metadata
   - Handles database operations via PostgreSQL
   - Provides RESTful endpoints for all operations

2. **Application Service** (`/app`)
   - Express application
   - Handles user-facing certificate requests
   - Manages certificate generation workflow
   - Implements browser-based CSR generation

3. **Admin Service** (`/manager`)
   - Express application
   - Provides administrative interface
   - Manages certificate revocation
   - Handles user group management

### Database Schema
The system uses one PostgreSQL databases:

Tables:
- `request` - Certificate requests
- `users` - User information
- `groups` - Group definitions
- `user_groups` - User-group relationships
- `certificate` - Certificate metadata

## Security Implementation

### Authentication & Authorization
- JWT for web form authentication
- Certificate-based authentication for admin interface
- Group-based access control via certificate SAN fields
- Required group: "CertM3_Admin"

### Certificate Security
- Modern cryptographic standards:
  - Elliptic curves for keypairs
  - SHA384 for digests
  - Minimum 2048-bit keys (configurable)
- PKCS#12 password requirements:
  - 32-64 bits of entropy
  - Browser-generated secure passwords preferred
  - No specific structure enforcement

### Rate Limiting
- Implemented via nginx
- 1 signature per 10s per connection/userid
- IP-based blocking for failed attempts (via nginx)

## User Workflow

### 1. User Registration
1. User visits `/` selects 'Register Button' loads /app/register page 
2. Enters username, display name, email - submit sends to /app/validate page
3. System validates username availability dynamically as the user is typing (with hysterisis and debounce)
4. Request stored in 'pending' state in request database table
5. Email validation token (UUID) generated
6. User redirected to validation page

### 2. Email Validation
1. User receives validation email
2. Clicks validation link or enters token manually
3. System validates token (1-day expiration)
4. User created in database
5. Request marked as 'completed'
6. User redirected to certificate request page

### 3. Certificate Generation
1. User enters password for key protection
2. Browser generates keypair
3. CSR created with:
   - CN (username)
   - E (email)
   - Fixed fields from configuration
4. CSR submitted for signing
5. Certificate wrapped in PKCS#12
6. File downloaded to user's browser

## API Endpoints

### User Management
- `POST /users` - Create user
- `GET /users/check-username/{username}` - Check availability
- `GET /users/{id}` - Get user details
- `PATCH /users/{id}` - Update user
- `DELETE /users/{id}` - Delete user
- `POST /users/{id}/validate-email` - Validate email
- `POST /users/verify-validation-token` - Verify token

### Certificate Management
- `POST /certificates` - Create certificate
- `GET /certificates/{id}` - Get certificate
- `GET /certificates/search` - Search certificates
- `PATCH /certificates/{id}` - Update certificate
- `DELETE /certificates/{id}` - Delete certificate
- `GET /certificate/crl/{fingerprint}` - Check revocation
- `GET /certificate/crl/list` - List revoked certificates

## User Interface

### Design
- Semantic UI Design
- Handlebars templating
- Consistent navigation:
  - Home button
  - Support button
  - Copyright notice
- Error display:
  - Light red background
  - Dark red text

### Pages
1. User Registration    /app/register
2. Email Validation	/app/validate
3. Certificate Request  /app/certreq
4. Certificate Download /app/CSRproc
5. Certificate Status   /app/certificate
5. Certificate Replacement or Update /app/certreq
6. Email ID ReValidation /app/revalidate
5. Support Documentation / and /app/support

## Monitoring & Logging

### Metrics
- Request serving time
- Certificate signing time
- User page dwell time
- `/metrics` endpoint for Prometheus integration

### Logging
- Write to stdout/stderr
- Log files in `/var/spool/CertM3/{appname}/logs`
- PM2 process management

## Testing Strategy

### Test Coverage
- URL route paths
- Username availability

	The web app repeatedly calls a check username api to validate the prospective username for availability and form.  The test should call this with a sequence of random characters until the username is reported as available.

- User creation

	After the Username Availibility test completes, submit a user creation request to the appropriate user api.  This should trigger the creation of either a test email artifact in /var/spool/certM3/test-emails, or a log entry.  

- User Request Validation

	The token for the above should be sent to the /request/validate page, and a successful result should be a JWT authenticated redirect to the certificate-request page.

- CSR generation
- CSR signing
- PKCS#12 wrapping
- CRL generation
- API endpoints

### End-to-End Testing
- User registration flow
- Email validation
- Certificate generation
- Certificate download

## Deployment

### Directory Structure
```
/
|-- webroot/       # Static files (not templates)
├── api/           # Loopback4 API service
├── app/           # Express based request service
├── admin/         # Express based admin service
└── ca/            # Certificate authority
```

### Environment Configuration

	These should be default values, not environment values if possible.

- `BASE_URL` (default: https://urp.ogt11.com/)
- `KEYLENGTH` (default: 4096)

## Documentation
- OpenAPI/Swagger documentation
- One-page user guides per component
- API documentation in OpenAPI format

## Questions for Review
1. Should we implement any specific caching strategy for frequently accessed data?

	No.

2. Are there any specific browser compatibility requirements beyond Firefox?

	Chrome/Edge

3. Should we implement any specific backup strategy for the certificate database?

	No.

4. Are there any specific requirements for the certificate revocation list format?

	No, but upon reflection, we should implement an api to support OCSP.

5. Should we implement any specific monitoring alerts beyond timeouts?

	No.

6.  One final bit.

		The applications should always be accessed by their URL.  urp.ogt11.com resolves to 127.0.0.1 or ::1, but always has a certificate.  That way we can use TLS, even in development.
		Apps may need to talk to each other directly via their localhost:port mechanism, to ensure local (on machine) communications, which are in memory and don't require crypto.
		But no testing or other external (even on same machine) should have "localhost" or should assume that if localhost works we're done.  Only done if BASE_URL works.

7. On group addition.  The list of groups presented to an initial user will be less, perhaps none, than those presented to a validated user.  Else we risk leaking our group structure to non-users. When a user is validated and has their first certificate, with the certM3_user role assigned, then they can return and request more certificates with one or more group names entered into the SAN field .  A user may have many certificates, each certificate may reference multiple group names in the SAN field.



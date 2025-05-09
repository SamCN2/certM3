# CertM3 API System Analysis

## 1. Implementation Analysis

### User Controller (`user.controller.ts`)

#### Routes
- `POST /users` - Create user
- `GET /users` - List users
- `GET /users/{id}` - Get user by ID
- `PATCH /users/{id}` - Update user
- `POST /users/{id}/deactivate` - Deactivate user

#### Request/Response Formats
```typescript
// POST /users
Request: {
  username: string;
  email: string;
  displayName: string;
}
Response: User object

// GET /users
Query: { status?: 'active' | 'inactive' }
Response: User[]

// GET /users/{id}
Response: User

// PATCH /users/{id}
Request: {
  displayName?: string;
  email?: string;
}
Response: 204 No Content

// POST /users/{id}/deactivate
Response: 204 No Content
```

#### Error Cases
- 409: Username or email already exists
- 404: User not found
- 400: User is already inactive

#### Query Parameters
- `status`: Filter users by status (active/inactive)

### Certificate Controller (`certificate.controller.ts`)

#### Routes
- `POST /certificates` - Create certificate
- `GET /certificates` - List certificates
- `GET /certificates/{id}` - Get certificate by ID
- `PATCH /certificates/{id}` - Update certificate
- `POST /certificates/{id}/revoke` - Revoke certificate

#### Request/Response Formats
```typescript
// POST /certificates
Request: {
  serialNumber: string;
  codeVersion: string;
  username: string;
  userId: string;
  commonName: string;
  email: string;
  fingerprint: string;
  notBefore: string;
  notAfter: string;
}
Response: Certificate

// GET /certificates
Query: {
  username?: string;
  status?: 'active' | 'revoked';
}
Response: Certificate[]

// GET /certificates/{id}
Response: Certificate

// PATCH /certificates/{id}
Request: {
  codeVersion?: string;
  commonName?: string;
  email?: string;
  notBefore?: string;
  notAfter?: string;
}
Response: 204 No Content

// POST /certificates/{id}/revoke
Request: {
  revokedBy: string;
  revocationReason: string;
}
Response: 204 No Content
```

#### Error Cases
- 409: Certificate with this fingerprint already exists
- 400: Invalid certificate dates
- 404: Certificate not found
- 400: Certificate is already revoked
- 400: Cannot update a revoked certificate

#### Query Parameters
- `username`: Filter by username
- `status`: Filter by status (active/revoked)

### Request Controller (`request.controller.ts`)

#### Routes
- `POST /requests` - Create request
- `GET /requests/{id}` - Get request by ID
- `GET /requests/search` - Search requests
- `POST /requests/{id}/validate` - Validate request
- `POST /requests/{id}/cancel` - Cancel request

#### Request/Response Formats
```typescript
// POST /requests
Request: {
  username: string;
  displayName: string;
  email: string;
}
Response: Request

// GET /requests/{id}
Response: Request

// GET /requests/search
Query: {
  username?: string;
  email?: string;
  status?: string;
}
Response: Request[]

// POST /requests/{id}/validate
Request: {
  challenge: string;
}
Response: 204 No Content

// POST /requests/{id}/cancel
Response: 204 No Content
```

#### Error Cases
- 409: Request with this username already exists
- 404: Request not found
- 400: Request is not pending
- 400: Invalid challenge

#### Query Parameters
- `username`: Filter by username
- `email`: Filter by email
- `status`: Filter by status

### Group Controller (`group.controller.ts`)

#### Routes
- `POST /groups` - Create group
- `GET /groups` - List groups
- `GET /groups/{id}` - Get group by ID
- `PATCH /groups/{id}` - Update group
- `DELETE /groups/{id}` - Delete group
- `GET /groups/{name}/members` - Get group members
- `POST /groups/{name}/members` - Add members to group
- `DELETE /groups/{name}/members` - Remove members from group

#### Request/Response Formats
```typescript
// POST /groups
Request: {
  name: string;
  displayName: string;
  description?: string;
}
Response: Group

// GET /groups
Response: Group[]

// GET /groups/{id}
Response: Group

// PATCH /groups/{id}
Request: {
  displayName?: string;
  description?: string;
}
Response: 204 No Content

// DELETE /groups/{id}
Response: 204 No Content

// GET /groups/{name}/members
Response: User[]

// POST /groups/{name}/members
Request: {
  userIds: string[];
}
Response: 204 No Content

// DELETE /groups/{name}/members
Request: {
  userIds: string[];
}
Response: 204 No Content
```

#### Error Cases
- 409: Group with this name already exists
- 409: Cannot create the users group
- 404: Group not found
- 403: Cannot modify the users group
- 403: Cannot delete the users group
- 403: Cannot remove users from the users group

#### Query Parameters
None

### Ping Controller (`ping.controller.ts`)

#### Routes
- `GET /api/ping` - Health check

#### Request/Response Formats
```typescript
// GET /api/ping
Response: {
  greeting: string;
  date: string;
  url: string;
  headers: object;
}
```

#### Error Cases
None

#### Query Parameters
None

## 2. Documentation Analysis

### Documented Endpoints

#### Users
- `POST /users` - Create user
- `GET /users` - List users
- `GET /users/{id}` - Get user by ID

#### Certificates
- `POST /certificates` - Create certificate
- `GET /certificates` - List certificates
- `GET /certificates/{id}` - Get certificate by ID
- `PATCH /certificates/{id}` - Update certificate
- `POST /certificates/{id}/revoke` - Revoke certificate

#### Requests
- `POST /requests` - Create request
- `GET /requests/search` - Search requests
- `POST /requests/{id}/validate` - Validate request

#### Groups
- `POST /groups` - Create group
- `GET /groups` - List groups
- `GET /groups/{id}` - Get group by ID
- `DELETE /groups/{id}` - Delete group
- `GET /groups/{name}/members` - Get group members

#### Health Check
- `GET /ping` - Health check

### Documented Request/Response Formats
[See OpenAPI specification for detailed formats]

### Documented Error Cases
- 200: Success
- 204: Success (no content)
- 400: Bad Request
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 500: Internal Server Error

### Documented Query Parameters
- Users: `status` (active/inactive)
- Certificates: `status` (active/revoked)
- Requests: `status` (pending/approved/rejected)

## 3. Discrepancy Report

### Endpoints in Implementation but not in Docs
1. User Controller:
   - `PATCH /users/{id}` - Update user
   - `POST /users/{id}/deactivate` - Deactivate user

2. Request Controller:
   - `GET /requests/{id}` - Get request by ID
   - `POST /requests/{id}/cancel` - Cancel request

3. Group Controller:
   - `PATCH /groups/{id}` - Update group
   - `POST /groups/{name}/members` - Add members to group
   - `DELETE /groups/{name}/members` - Remove members from group

### Endpoints in Docs but not in Implementation
None

### Format Mismatches
1. Ping endpoint path:
   - Implementation: `/api/ping`
   - Documentation: `/ping`

2. Request search response:
   - Implementation: Includes relations
   - Documentation: Basic request object

### Error Handling Differences
1. Implementation has more specific error cases:
   - User deactivation errors
   - Certificate revocation errors
   - Request validation errors
   - Group member management errors

2. Documentation has generic error cases:
   - 200: Success
   - 204: Success (no content)
   - 400: Bad Request
   - 403: Forbidden
   - 404: Not Found
   - 409: Conflict
   - 500: Internal Server Error

### Query Parameter Differences
1. Certificate list:
   - Implementation: `username`, `status`
   - Documentation: `status` only

2. Request search:
   - Implementation: `username`, `email`, `status`
   - Documentation: `status` only

## 4. Action Items

### Documentation Updates Needed
1. Add missing endpoints:
   - User update and deactivate
   - Request get by ID and cancel
   - Group update and member management

2. Update query parameters:
   - Add username filter to certificate list
   - Add username and email filters to request search

3. Fix ping endpoint path:
   - Standardize on either `/api/ping` or `/ping`

4. Add missing error cases:
   - Document specific error cases for each endpoint
   - Add examples for each error case

### Implementation Updates Needed
1. Standardize error handling:
   - Use consistent error codes
   - Add missing error cases
   - Improve error messages

2. Consider adding missing features:
   - Implement any missing documented features
   - Add validation for query parameters

3. Clean up unused code:
   - Remove unused query parameters
   - Remove unused endpoints

### Design Decisions Needed
1. API Path Structure:
   - Should we keep or remove the `/api` prefix?
   - Should we standardize path naming?

2. Query Parameters:
   - Should we standardize parameter naming?
   - Should we add more filtering options?

3. Error Handling:
   - Should we implement all documented error cases?
   - Should we add more specific error cases?

4. Feature Implementation:
   - Should we implement all documented features?
   - Should we add new features?

5. Documentation:
   - Should we use OpenAPI or Markdown?
   - Should we add more examples?
   - Should we add more detailed descriptions? 
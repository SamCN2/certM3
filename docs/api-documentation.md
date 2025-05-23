# CertM3 API Documentation

## Overview

The CertM3 API provides endpoints for managing certificates, users, groups, and certificate requests. This documentation describes the available endpoints, their request/response formats, and error handling.

## Base URLs

- Production: `https://urp.ogt11.com/api`
- Development: `http://localhost:3000`

## Authentication

Currently, the API does not require authentication. This will be implemented in a future version.

## Error Handling

All endpoints return errors in a consistent format:

```json
{
  "error": {
    "statusCode": 400,
    "name": "BadRequestError",
    "message": "Error description"
  }
}
```

## Endpoints

### Users

#### Create User
```http
POST /users
```

Request body:
```json
{
  "username": "string",     // Required, unique
  "email": "string",        // Required, unique, valid email format
  "displayName": "string"   // Required, defaults to 'Unknown'
}
```

Response: User object with auto-generated UUID and timestamps

#### List Users
```http
GET /users?status=active
```

Query parameters:
- `status`: Filter by user status (active/inactive)

Response: Array of User objects

#### Get User by ID
```http
GET /users/{id}
```

Path parameters:
- `id`: User UUID

Response: User object

#### Deactivate User
```http
POST /users/{id}/deactivate
```

Path parameters:
- `id`: User UUID

Response: 204 No Content

Note: This will trigger automatic deactivation of the user's certificates.

#### Get User Groups
```http
GET /users/{userId}/groups
```

Path parameters:
- `userId`: User UUID

Response: Array of group names

### Certificates

#### Sign Certificate
```http
POST /certificates/sign
```

Request body:
```json
{
  "userId": "uuid",         // Required
  "username": "string",     // Required
  "email": "string",        // Required, valid email format
  "commonName": "string",   // Required
  "groupNames": ["string"], // Required, array of group names
  "notBefore": "string",    // Optional, ISO date
  "notAfter": "string"      // Optional, ISO date
}
```

Response:
```json
{
  "certificate": "string"   // PEM format
}
```

Note: Private keys are generated and stored only in the user's browser.

#### Create Certificate Record
```http
POST /certificates
```

Request body:
```json
{
  "serialNumber": "uuid",   // Auto-generated
  "codeVersion": "string",  // Required, max length 50
  "username": "string",     // Required
  "userId": "uuid",         // Required
  "commonName": "string",   // Required
  "email": "string",        // Required, valid email format
  "fingerprint": "string",  // Required, unique
  "notBefore": "string",    // Required, ISO date
  "notAfter": "string"      // Required, ISO date
}
```

Response: Certificate object

#### List Certificates
```http
GET /certificates?status=active
```

Query parameters:
- `status`: Filter by certificate status (active/revoked)

Response: Array of Certificate objects

#### Get Certificate by ID
```http
GET /certificates/{id}
```

Path parameters:
- `id`: Certificate UUID

Response: Certificate object

#### Update Certificate
```http
PATCH /certificates/{id}
```

Path parameters:
- `id`: Certificate UUID

Request body:
```json
{
  "codeVersion": "string",  // Optional
  "commonName": "string",   // Optional
  "email": "string",        // Optional, valid email format
  "notBefore": "string",    // Optional, ISO date
  "notAfter": "string"      // Optional, ISO date
}
```

Response: 204 No Content

#### Revoke Certificate
```http
POST /certificates/{id}/revoke
```

Path parameters:
- `id`: Certificate UUID

Request body:
```json
{
  "revokedBy": "string",    // Required
  "revocationReason": "string"  // Required
}
```

Response: 204 No Content

### Groups

#### Create Group
```http
POST /groups
```

Request body:
```json
{
  "name": "string",         // Required, unique
  "displayName": "string",  // Required
  "description": "string"   // Optional
}
```

Response: Group object

#### List Groups
```http
GET /groups
```

Response: Array of Group objects

#### Get Group by Name
```http
GET /groups/{name}
```

Path parameters:
- `name`: Group name

Response: Group object

#### Delete Group
```http
DELETE /groups/{name}
```

Path parameters:
- `name`: Group name

Response: 204 No Content

Note: Cannot delete the 'users' group.

#### Get Group Members
```http
GET /groups/{name}/members
```

Path parameters:
- `name`: Group name

Response: Array of User objects

### Requests

#### Create Request
```http
POST /requests
```

Request body:
```json
{
  "username": "string",     // Required
  "displayName": "string",  // Required
  "email": "string"         // Required, valid email format
}
```

Response: Request object with auto-generated UUID and timestamps

#### Get Request by ID
```http
GET /requests/{id}
```

Path parameters:
- `id`: Request UUID

Response: Request object

#### Search Requests
```http
GET /requests/search?status=pending
```

Query parameters:
- `status`: Filter by request status (pending/approved/rejected)

Response: Array of Request objects

#### Validate Request
```http
POST /requests/{id}/validate
```

Path parameters:
- `id`: Request UUID

Request body:
```json
{
  "challenge": "string"     // Required
}
```

Response: 204 No Content

#### Cancel Request
```http
POST /requests/{id}/cancel
```

Path parameters:
- `id`: Request UUID

Response: 204 No Content

## Status Codes

- 200: Success
- 204: No Content
- 400: Bad Request
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 500: Internal Server Error

## Data Types

### UUID
All IDs are UUIDs (version 4) and are auto-generated by the database.

### Timestamps
All timestamps are in ISO 8601 format with timezone information.

### Status Enums
- User Status: `active`, `inactive`
- Certificate Status: `active`, `revoked`
- Request Status: `pending`, `approved`, `rejected`
- Group Status: `active`, `inactive`

## Constraints

### Unique Fields
- User: username, email
- Group: name
- Certificate: fingerprint

### Required Fields
All required fields are marked as such in the request/response schemas.

### Default Values
- User displayName: 'Unknown'
- IDs: Auto-generated UUIDs
- Timestamps: Current time for created_at/updated_at

## Triggers

The database includes a trigger that automatically deactivates a user's certificates when the user is deactivated.

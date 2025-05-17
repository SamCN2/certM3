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
    "name": "ErrorName",
    "message": "Error message"
  }
}
```

Common HTTP status codes:
- 200: Success
- 204: Success (no content)
- 400: Bad Request
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 500: Internal Server Error

## Endpoints

### Users

#### Create User
- **POST** `/users`
- **Request Body:**
  ```json
  {
    "username": "string",
    "email": "string",
    "displayName": "string"
  }
  ```
- **Response:** User object
- **Error Codes:**
  - 409: Username or email already exists

#### List Users
- **GET** `/users`
- **Query Parameters:**
  - `status`: Filter by status (active/inactive)
- **Response:** Array of User objects

#### Get User by ID
- **GET** `/users/{id}`
- **Response:** User object
- **Error Codes:**
  - 404: User not found

#### Get User Groups
- **GET** `/users/{userId}/groups`
- **Response:** Array of group names (strings)
- **Note:** This endpoint returns a lightweight list of group names to avoid repeated calls to get group details.

### Certificates

#### Create Certificate
- **POST** `/certificates`
- **Request Body:**
  ```json
  {
    "serialNumber": "uuid",
    "codeVersion": "string",
    "username": "string",
    "userId": "uuid",
    "commonName": "string",
    "email": "string",
    "fingerprint": "string",
    "notBefore": "date-time",
    "notAfter": "date-time"
  }
  ```
- **Response:** Certificate object
- **Error Codes:**
  - 400: Invalid certificate dates (notBefore must be before notAfter)
  - 409: Certificate with this fingerprint already exists

#### List Certificates
- **GET** `/certificates`
- **Query Parameters:**
  - `status`: Filter by status (active/revoked)
- **Response:** Array of Certificate objects

#### Get Certificate by ID
- **GET** `/certificates/{id}`
- **Response:** Certificate object
- **Error Codes:**
  - 404: Certificate not found

#### Update Certificate
- **PATCH** `/certificates/{id}`
- **Request Body:**
  ```json
  {
    "codeVersion": "string",
    "commonName": "string",
    "email": "string",
    "notBefore": "date-time",
    "notAfter": "date-time"
  }
  ```
- **Response:** 204 No Content
- **Error Codes:**
  - 400: Invalid certificate dates or certificate is revoked
  - 404: Certificate not found

#### Revoke Certificate
- **POST** `/certificates/{id}/revoke`
- **Request Body:**
  ```json
  {
    "revokedBy": "string",
    "revocationReason": "string"
  }
  ```
- **Response:** 204 No Content
- **Error Codes:**
  - 400: Certificate is already revoked
  - 404: Certificate not found

### Groups

#### Create Group
- **POST** `/groups`
- **Request Body:**
  ```json
  {
    "name": "string",
    "displayName": "string",
    "description": "string"
  }
  ```
- **Response:** Group object
- **Error Codes:**
  - 409: Group with this name already exists or cannot create users group

#### List Groups
- **GET** `/groups`
- **Response:** Array of Group objects

#### Get Group by ID
- **GET** `/groups/{id}`
- **Response:** Group object
- **Error Codes:**
  - 404: Group not found

#### Delete Group
- **DELETE** `/groups/{id}`
- **Response:** 204 No Content
- **Error Codes:**
  - 403: Cannot delete the users group
  - 404: Group not found

#### Get Group Members
- **GET** `/groups/{name}/members`
- **Response:** Array of User objects
- **Error Codes:**
  - 404: Group not found

#### Add Group Members
- **POST** `/groups/{name}/members`
- **Request Body:**
  ```json
  {
    "userIds": ["uuid1", "uuid2"]
  }
  ```
- **Response:** 204 No Content

#### Remove Group Members
- **DELETE** `/groups/{name}/members`
- **Request Body:**
  ```json
  {
    "userIds": ["uuid1", "uuid2"]
  }
  ```
- **Response:** 204 No Content

### Requests

#### Create Request
- **POST** `/requests`
- **Request Body:**
  ```json
  {
    "username": "string",
    "displayName": "string",
    "email": "string"
  }
  ```
- **Response:** Request object
- **Error Codes:**
  - 409: Request with this username already exists

#### Search Requests
- **GET** `/requests/search`
- **Query Parameters:**
  - `status`: Filter by status (pending/approved/rejected)
- **Response:** Array of Request objects

#### Validate Request
- **POST** `/requests/{id}/validate`
- **Request Body:**
  ```json
  {
    "challenge": "string"
  }
  ```
- **Response:** 204 No Content
- **Error Codes:**
  - 400: Invalid request state or challenge token
  - 404: Request not found

### Health Check

#### Ping
- **GET** `/ping`
- **Response:**
  ```json
  {
    "greeting": "string",
    "date": "date-time",
    "url": "string",
    "headers": {}
  }
  ```

## Data Models

### User
```json
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "displayName": "string",
  "status": "active|inactive",
  "createdAt": "date-time",
  "createdBy": "string",
  "updatedAt": "date-time",
  "updatedBy": "string"
}
```

### Certificate
```json
{
  "serialNumber": "uuid",
  "codeVersion": "string",
  "username": "string",
  "userId": "uuid",
  "commonName": "string",
  "email": "string",
  "fingerprint": "string",
  "notBefore": "date-time",
  "notAfter": "date-time",
  "status": "active|revoked",
  "revokedAt": "date-time",
  "revokedBy": "string",
  "revocationReason": "string",
  "createdAt": "date-time",
  "createdBy": "string",
  "updatedAt": "date-time",
  "updatedBy": "string"
}
```

### Group
```json
{
  "name": "string",
  "displayName": "string",
  "description": "string",
  "status": "active|inactive",
  "createdAt": "date-time",
  "createdBy": "string",
  "updatedAt": "date-time",
  "updatedBy": "string"
}
```

### Request
```json
{
  "id": "uuid",
  "username": "string",
  "displayName": "string",
  "email": "string",
  "status": "pending|approved|rejected",
  "challenge": "string",
  "createdAt": "date-time",
  "createdBy": "string",
  "updatedAt": "date-time",
  "updatedBy": "string"
}
```

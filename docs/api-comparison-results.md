# API Comparison Results

## Overview
This document compares the actual running APIs with the documented specifications to identify discrepancies and outdated documentation.

**Date**: $(date +%Y-%m-%d)
**Testing Environment**: `https://urp.ogt11.com`

## 🔍 Backend API Analysis

### ✅ Actual Running API
- **Base URL**: `https://urp.ogt11.com/api`
- **Status**: ✅ Running and responding
- **OpenAPI Spec**: ✅ Available at `/api/openapi.json`
- **Size**: 1,506 lines
- **Saved**: `docs/actual-backend-api.yaml`

### 📋 Actual Endpoints Found

#### Core Endpoints
- `/ping` - Health check endpoint
- `/users` - User management (GET, POST)
- `/users/{id}` - Individual user operations (GET, PATCH)
- `/users/{userId}/groups` - User group management (GET)
- `/users/username/{username}` - Get user by username (GET)
- `/users/{id}/deactivate` - Deactivate user (POST)

#### Request Management
- `/requests` - Certificate requests (GET, POST)
- `/requests/{id}` - Individual request operations (GET)
- `/requests/{id}/validate` - Request validation (POST)
- `/requests/{id}/cancel` - Request cancellation (POST)
- `/requests/search` - Search requests (GET)
- `/request/check-username/{username}` - Username availability (GET)

#### Group Management
- `/groups` - Group management (GET, POST)

#### Certificate Management ⭐ **NEW**
- `/certificates` - Certificate operations (GET, POST)
- `/certificates/{id}` - Individual certificate operations (GET, PATCH)
- `/certificates/{id}/revoke` - Certificate revocation (POST)

### 📊 Comparison with Documentation

| Document | Size | Status | Certificate Endpoints |
|----------|------|--------|----------------------|
| `docs/actual-backend-api.yaml` | 1,506 lines | ✅ **Current** | ✅ **Present** |
| `docs/newopenapi.yaml` | 1,275 lines | ❌ **Outdated** | ❌ **Missing** |
| `docs/openapi.yaml` | 1,295 lines | ❌ **Outdated** | ❌ **Missing** |

### 🔍 Key Differences Found

#### Missing from Documentation
1. **Certificate Management Endpoints**:
   - `/certificates` - List and create certificates
   - `/certificates/{id}` - Get and update certificates
   - `/certificates/{id}/revoke` - Revoke certificates

2. **Additional User Endpoints**:
   - `/users/username/{username}` - Get user by username
   - `/users/{id}/deactivate` - Deactivate user

3. **Enhanced Request Management**:
   - `/requests/search` - Search requests with filters
   - More detailed request validation and cancellation

#### Schema Differences
- **Certificate Schema**: Present in actual API, missing from documentation
- **Enhanced User Schema**: More fields and relations in actual API
- **Request Schema**: More comprehensive in actual API

## 🔍 Middleware API Analysis

### ✅ Actual Running API
- **Base URL**: `https://urp.ogt11.com/app`
- **Status**: ✅ Running and responding
- **OpenAPI Spec**: ❌ **Not available** (no `/openapi.json` endpoint)
- **Endpoints**: Responds to `/app/initiate-request` (requires email)

### 📋 Middleware Endpoints
- `/app/initiate-request` - Certificate request initiation (POST)
- **Note**: No OpenAPI specification endpoint available

### 📊 Comparison with Documentation

| Document | Status | OpenAPI Spec |
|----------|--------|--------------|
| `src/mw/docs/api/frontend-middleware-openapi.yaml` | ❓ **Unknown** | ✅ **Available** |
| Actual Middleware | ✅ **Running** | ❌ **Not available** |

## 🚨 Issues Identified

### 1. Outdated API Documentation
- **`docs/newopenapi.yaml`** and **`docs/openapi.yaml`** are missing certificate endpoints
- **`docs/newopenapi.yaml`** is missing 231 lines of API specification
- Certificate management functionality is completely undocumented

### 2. Missing Middleware OpenAPI
- Middleware API is running but doesn't expose OpenAPI specification
- Documentation exists but may not match actual implementation

### 3. Inconsistent Documentation
- Multiple API specification files with different content
- No clear indication of which specification is current

## 📋 Recommendations

### Immediate Actions
1. **Update API Documentation**:
   - Replace `docs/newopenapi.yaml` with `docs/actual-backend-api.yaml`
   - Remove outdated `docs/openapi.yaml`
   - Update API documentation to include certificate endpoints

2. **Middleware API**:
   - Add OpenAPI specification endpoint to middleware
   - Verify middleware documentation matches actual implementation
   - Test all documented middleware endpoints

3. **Documentation Cleanup**:
   - Remove duplicate and outdated API specifications
   - Create single source of truth for API documentation
   - Add versioning to API specifications

### Long-term Improvements
1. **API Versioning**: Implement proper API versioning
2. **Automated Testing**: Add tests to verify documentation matches implementation
3. **Documentation Pipeline**: Automate API documentation updates
4. **Middleware Enhancement**: Add OpenAPI specification generation to middleware

## 📝 Next Steps

1. **Update Documentation**: Replace outdated API specifications with current ones
2. **Test Middleware**: Verify all middleware endpoints work as documented
3. **Clean Up Files**: Remove duplicate and outdated documentation
4. **Add Certificate Docs**: Document the new certificate management endpoints
5. **Create API Guide**: Update user documentation with current endpoints

## Files to Update

### Keep (Current)
- `docs/actual-backend-api.yaml` - **Current running API specification**

### Update
- `docs/newopenapi.yaml` - Replace with actual API spec
- `docs/api-documentation.md` - Add certificate endpoints
- `docs/README-certM3-api.md` - Update with current endpoints

### Remove (Outdated)
- `docs/openapi.yaml` - Outdated specification
- `src/api/src/openapi.yaml` - Incomplete specification

### Investigate
- `src/mw/docs/api/frontend-middleware-openapi.yaml` - Verify against actual middleware 
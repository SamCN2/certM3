# Middleware Missing OpenAPI Endpoint

## Issue Description
The middleware API is running and functional but does not expose an OpenAPI specification endpoint, making it difficult to understand, test, and document the API.

## Problem Details

### Current State
- **Middleware API**: Running at `https://urp.ogt11.com/app`
- **Status**: ✅ Functional and responding to requests
- **OpenAPI Endpoint**: ❌ Not available (`/app/openapi.json` returns 404)
- **Documentation**: Exists in `src/mw/docs/api/frontend-middleware-openapi.yaml` but cannot be verified

### Impact
- **API Discovery**: No automatic way to discover available endpoints
- **Testing**: Cannot use OpenAPI tools for testing
- **Documentation**: Cannot verify documentation matches implementation
- **Integration**: Difficult for other systems to integrate
- **Development**: Developers cannot easily understand the API

## Technical Analysis

### Expected Endpoints
Based on testing, the middleware appears to have:
- `/app/initiate-request` - Certificate request initiation (POST)

### Missing OpenAPI Features
- No `/app/openapi.json` endpoint
- No `/app/swagger.json` endpoint
- No `/app/docs` endpoint
- No API documentation endpoint

## Proposed Solution

### Phase 1: Add OpenAPI Endpoint
1. **Add OpenAPI specification generation** to middleware
   - Generate OpenAPI spec from route definitions
   - Expose spec at `/app/openapi.json`
   - Include proper metadata and descriptions

2. **Add API documentation endpoint**
   - Expose Swagger UI at `/app/docs`
   - Provide interactive API documentation
   - Include example requests and responses

### Phase 2: Enhance API Discovery
1. **Add API metadata endpoints**
   - `/app/health` - Health check endpoint
   - `/app/version` - API version information
   - `/app/info` - API information and capabilities

2. **Add proper HTTP headers**
   - Include API version in headers
   - Add CORS headers for web access
   - Include rate limiting headers

## Implementation Steps

### Step 1: Analyze Current Middleware Structure
- [ ] Review middleware route definitions
- [ ] Identify all available endpoints
- [ ] Document request/response schemas
- [ ] Map current functionality to OpenAPI spec

### Step 2: Add OpenAPI Generation
- [ ] Add OpenAPI library to middleware
- [ ] Generate OpenAPI spec from routes
- [ ] Add `/app/openapi.json` endpoint
- [ ] Add `/app/docs` endpoint with Swagger UI

### Step 3: Update Documentation
- [ ] Replace static OpenAPI file with generated spec
- [ ] Update API documentation
- [ ] Add examples and descriptions
- [ ] Verify documentation matches implementation

### Step 4: Testing and Validation
- [ ] Test OpenAPI endpoint accessibility
- [ ] Verify spec matches actual API
- [ ] Test Swagger UI functionality
- [ ] Validate against existing documentation

## Acceptance Criteria
- [ ] `/app/openapi.json` endpoint returns valid OpenAPI specification
- [ ] `/app/docs` endpoint provides interactive API documentation
- [ ] OpenAPI spec matches actual API implementation
- [ ] All endpoints are properly documented
- [ ] Examples and descriptions are included
- [ ] API versioning is implemented

## Priority
**High** - This affects API discoverability and developer experience

## Labels
- `enhancement`
- `middleware`
- `api`
- `documentation`
- `openapi`

## Related Components
- `src/mw/` - Middleware component
- `src/mw/docs/api/frontend-middleware-openapi.yaml` - Existing documentation
- `docs/api-comparison-results.md` - API analysis results

## Notes
- This issue was discovered during API documentation cleanup analysis
- The middleware is functional but lacks proper API documentation endpoints
- Adding OpenAPI support will improve developer experience and API discoverability
- Consider using a Go OpenAPI library like `github.com/getkin/kin-openapi` or similar 
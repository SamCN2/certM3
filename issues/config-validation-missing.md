# Missing Config Validation - Services Start with Placeholder URLs

## Problem
The CertM3 services (API, middleware, signer) start up successfully even when the configuration contains placeholder values like "your-domain.com" instead of actual domain names. This creates a false sense that the system is working when it's actually non-functional.

## Current Behavior
- Services load `config/config.default.yaml` without validation
- Placeholder URLs like `https://your-domain.com/api` are accepted
- Services start and appear "online" but are not functional
- No warnings or errors are logged about invalid configuration

## Expected Behavior
- Services should validate configuration on startup
- Placeholder values should be detected and rejected
- Clear error messages should indicate what needs to be configured
- Services should fail to start with invalid configuration

## Affected Components
- API (`src/api/`)
- Middleware (`src/mw/cmd/certm3-app/`)
- Signer (`src/mw/cmd/certm3-signer/`)

## Configuration Fields Requiring Validation
- `app_server.frontend_baseurl` - should not contain "your-domain.com"
- `app_server.backend_baseurl` - should not contain "your-domain.com"  
- `signer.crl_distribution_url` - should not contain "your-domain.com"
- `signer.aia_issuer_url` - should not contain "your-domain.com"
- `signer.subject_o` - should not contain "your-organization.com"

## Proposed Solution: Connectivity Testing on Startup
Instead of just validating config values, implement actual connectivity tests:

1. **Middleware startup validation**:
   - Test connection to API (`app_server.backend_baseurl`)
   - Test connection to itself (health check endpoint)
   - Test connection to signer (Unix socket)

2. **Signer startup validation**:
   - Test CA certificate and key file accessibility
   - Test socket creation and permissions
   - Test basic certificate signing capability

3. **API startup validation**:
   - Test database connectivity
   - Test basic API endpoint functionality
   - Test middleware connectivity (if needed)

4. **Failure handling**:
   - Services should fail to start if connectivity tests fail
   - Clear error messages indicating what's not working
   - Retry logic for transient failures

## Benefits of Connectivity Testing
- Catches real-world issues, not just config problems
- Validates actual service dependencies
- Ensures the system is truly functional before marking as "online"
- Provides better debugging information

## Priority
**High** - This is a production risk as services can appear functional when they're not.

## Workaround
Currently, users must manually copy `config/config.default.yaml` to `config/config.yaml` and update the placeholder values. This is error-prone and not user-friendly.

## Related Files
- `config/config.default.yaml`
- `src/api/src/config.ts`
- `src/mw/internal/config/config.go`
- `src/mw/cmd/certm3-app/main.go`
- `src/mw/cmd/certm3-signer/main.go`
- `ecosystem.config.js` 
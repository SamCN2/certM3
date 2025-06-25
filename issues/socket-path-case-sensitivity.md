# Socket Path Case Sensitivity Issue

## Issue Description
There is an inconsistency in case usage for socket paths between configuration files and hardcoded paths in the middleware component, causing socket connection failures.

## Problem Details

### Inconsistent Path Usage
- **`src/mw/config.yaml`**: Uses `/var/run/certM3/` (capital M)
- **`src/mw/certM3.config`**: Uses `/var/run/certm3/` (lowercase m)
- **Hardcoded Go code**: Uses `/var/run/certM3/` (capital M)

### Files Affected
1. `src/mw/config.yaml` - Socket paths use capital M
2. `src/mw/certM3.config` - Socket paths use lowercase m
3. `src/mw/internal/app/testapi.go:260` - Hardcoded `/var/run/certM3/mw/signer.sock`
4. `src/mw/internal/app/handlers.go:855` - Hardcoded `/var/run/certM3/mw/signer.sock`

## Impact
- Socket connection failures between middleware components
- Inconsistent behavior depending on which config file is used
- Deployment confusion and potential failures
- Difficulty in development and testing

## Root Cause
- No standardized naming convention for socket paths
- Hardcoded paths in Go code instead of using configuration values
- Multiple config file formats with different conventions

## Proposed Solution

### 1. Standardize Naming Convention
**Recommendation**: Use lowercase `certm3` consistently
- More Unix-like convention
- Avoids case sensitivity issues
- Consistent with common practices

### 2. Update Configuration Files
- [ ] Update `src/mw/config.yaml` to use `/var/run/certm3/`
- [ ] Update `src/mw/certM3.config` to use `/var/run/certm3/`
- [ ] Ensure all socket paths use consistent case

### 3. Remove Hardcoded Paths
- [ ] Remove hardcoded socket path from `src/mw/internal/app/testapi.go:260`
- [ ] Remove hardcoded socket path from `src/mw/internal/app/handlers.go:855`
- [ ] Use configuration values instead of hardcoded paths

### 4. Add Configuration Validation
- [ ] Add validation to ensure socket paths are properly configured
- [ ] Add tests to verify socket connectivity
- [ ] Document the expected socket path format

## Implementation Steps

### Phase 1: Configuration Standardization
1. Update `config.yaml` to use lowercase paths
2. Update `certM3.config` to use lowercase paths
3. Test configuration loading

### Phase 2: Code Cleanup
1. Remove hardcoded paths from Go code
2. Use configuration values for socket connections
3. Add error handling for missing socket paths

### Phase 3: Testing and Validation
1. Test socket connectivity with new paths
2. Verify middleware communication works
3. Update deployment documentation

## Acceptance Criteria
- [ ] All config files use consistent lowercase `certm3` paths
- [ ] No hardcoded socket paths in Go code
- [ ] Socket connections work reliably
- [ ] Documentation updated with correct paths
- [ ] Tests pass with new configuration

## Priority
**High** - This affects core functionality and deployment reliability

## Labels
- `bug`
- `middleware`
- `configuration`
- `deployment`
- `socket`

## Related Documentation
- `docs/deployment-notes.md` - Contains detailed analysis of this issue
- `src/mw/docs/` - Middleware documentation

## Notes
- This issue was discovered during API documentation cleanup analysis
- The inconsistency prevents proper testing of middleware components
- Fixing this will improve deployment reliability and development experience 
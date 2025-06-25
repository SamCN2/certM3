# Deployment Notes

## Important Deployment Considerations

### Cert Signer Socket Permissions
**Date**: $(date +%Y-%m-%d)
**Issue**: The cert signer (middleware) socket uses `/var/run` directory which requires root privileges.

**Details**:
- The middleware component creates a Unix domain socket for certificate signing operations
- Standard location for such sockets is `/var/run/` which requires root privileges
- Socket creation itself doesn't require root, but the directory location does
- This affects deployment and maintenance procedures

**Impact**:
- Deployment scripts may need to run with elevated privileges for directory access
- Service restart procedures need to account for socket directory permissions
- Development environment setup may require sudo access or alternative socket location

**Recommendations**:
1. Document the exact socket path and permissions
2. Consider using alternative socket locations for development (e.g., `/tmp/`)
3. Include socket cleanup in deployment scripts
4. Add socket permission checks to health monitoring
5. Use systemd socket activation if appropriate

**Alternative Approaches**:
- Use `/tmp/certm3/` for development environments
- Configure socket path via environment variables
- Use user-specific runtime directories

### Socket Path Case Sensitivity Issue
**Date**: $(date +%Y-%m-%d)
**Issue**: Inconsistent case usage in socket paths between config files and hardcoded paths.

**Details**:
- `config.yaml` uses: `/var/run/certM3/` (capital M)
- `certM3.config` uses: `/var/run/certm3/` (lowercase m)
- Hardcoded paths in Go code use: `/var/run/certM3/` (capital M)
- This causes socket connection failures

**Files Affected**:
- `src/mw/config.yaml` - Uses `/var/run/certM3/`
- `src/mw/certM3.config` - Uses `/var/run/certm3/`
- `src/mw/internal/app/testapi.go:260` - Hardcoded `/var/run/certM3/mw/signer.sock`
- `src/mw/internal/app/handlers.go:855` - Hardcoded `/var/run/certM3/mw/signer.sock`

**Solution**:
1. Standardize on one case convention (recommend lowercase `certm3`)
2. Update all config files to use consistent case
3. Remove hardcoded paths from Go code
4. Use configuration values instead of hardcoded paths

### Related Files
- `src/mw/` - Middleware component
- `src/mw/docs/` - Middleware documentation
- `src/mw/docs/specs/` - Middleware specifications

---

## Additional Notes

*Add other deployment considerations here as they are discovered.*

## Maintenance Procedures

### Socket Management
```bash
# Check socket status (note case sensitivity)
ls -la /var/run/certM3/socket  # Current config.yaml version
ls -la /var/run/certm3/socket  # certM3.config version

# Clean up socket (requires root for /var/run)
sudo rm -f /var/run/certM3/mw/signer.sock
sudo rm -f /var/run/certm3/signer.sock

# Alternative: Use /tmp for development
mkdir -p /tmp/certm3
# Configure middleware to use /tmp/certm3/socket

# Restart service
sudo systemctl restart certm3-middleware
```

### Service Dependencies
- Middleware socket must be available before API can function
- Certificate signing operations depend on socket connectivity
- Monitor socket permissions and ownership
- Consider socket path configuration for different environments

### Configuration Consistency
- Ensure all config files use consistent case for paths
- Remove hardcoded paths from application code
- Use environment variables for path configuration
- Test socket connectivity after configuration changes 
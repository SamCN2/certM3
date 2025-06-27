# Nginx Configuration Integration and Coordination

## Issue Description

The `configure-nginx-paths.sh` and `configure-fqdn.sh` scripts have overlapping responsibilities and need better coordination to provide a seamless configuration experience.

## Current State

### `configure-fqdn.sh`
- ✅ Updates FQDN references throughout the codebase
- ✅ Handles SSL certificate paths for the new domain
- ✅ Updates nginx configuration with new domain names
- ❌ **Gap**: Doesn't handle project root paths or CA certificate paths

### `configure-nginx-paths.sh`
- ✅ Updates hardcoded project root paths
- ✅ Configures SSL certificate directory paths
- ✅ Updates CA certificate paths
- ❌ **Gap**: Doesn't handle FQDN changes or coordinate with FQDN script

## Problems

1. **Overlapping Responsibilities**: Both scripts modify nginx configuration
2. **Order Dependency**: Users must run scripts in specific order (FQDN → Paths)
3. **Redundant Work**: Some nginx configuration changes are duplicated
4. **User Confusion**: Two separate scripts for related configuration tasks
5. **Maintenance Overhead**: Changes to nginx config require updates in two places

## Proposed Solutions

### Option 1: Unified Configuration Script
Create a single `configure-system.sh` script that handles both FQDN and path configuration in one workflow.

**Benefits:**
- Single point of configuration
- No order dependency
- Consistent user experience
- Easier maintenance

**Implementation:**
```bash
./scripts/configure-system.sh
# Prompts for:
# 1. FQDN (with default)
# 2. Project root path (with default)
# 3. SSL certificate directory (with default)
# 4. CA certificate path (with default)
# 5. Confirmation and execution
```

### Option 2: Enhanced Coordination
Improve the existing scripts to work together better.

**Enhancements:**
- `configure-fqdn.sh` calls `configure-nginx-paths.sh` automatically
- Shared configuration file to store settings
- Validation that both scripts have been run
- Rollback capability if one script fails

### Option 3: Configuration Wizard
Create an interactive wizard that guides users through all configuration steps.

**Features:**
- Step-by-step guided configuration
- Validation at each step
- Preview of changes before applying
- Option to skip steps or use defaults

## Technical Considerations

### Shared Configuration
Create a configuration file (e.g., `config/system.conf`) to store:
```ini
[system]
fqdn = urp.ogt11.com
project_root = /home/samcn2/src/certM3
ssl_cert_dir = /etc/certs
ca_cert_path = /home/samcn2/src/certM3/CA/certs/ca-cert.pem
```

### Nginx Configuration Template
Use a template-based approach for nginx configuration:
- Template file with placeholders
- Script generates final config from template
- Easier to maintain and validate

### Validation and Rollback
- Validate all paths and configurations before applying
- Create comprehensive backups
- Provide rollback functionality
- Test nginx configuration syntax

## Implementation Priority

### High Priority
- [ ] Create unified configuration script
- [ ] Implement shared configuration file
- [ ] Add comprehensive validation
- [ ] Update documentation

### Medium Priority
- [ ] Add rollback functionality
- [ ] Create configuration wizard interface
- [ ] Add configuration validation checks
- [ ] Improve error handling

### Low Priority
- [ ] Add configuration migration tools
- [ ] Create configuration templates
- [ ] Add configuration export/import
- [ ] Add configuration testing framework

## Success Criteria

- [ ] Single command to configure entire system
- [ ] No manual coordination between scripts required
- [ ] Comprehensive validation and error handling
- [ ] Clear documentation and user guidance
- [ ] Backward compatibility with existing scripts
- [ ] Easy maintenance and updates

## Related Files

- `scripts/configure-fqdn.sh` - Current FQDN configuration script
- `scripts/configure-nginx-paths.sh` - Current nginx path configuration script
- `nginx/certm3.conf` - Nginx configuration template
- `README.md` - Documentation that needs updating

## Notes

- Consider creating a configuration management system for future extensibility
- Ensure the solution works for both development and production environments
- Maintain backward compatibility with existing deployments
- Consider adding configuration validation to the verify-build script 
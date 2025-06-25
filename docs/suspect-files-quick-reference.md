# Suspect Files Quick Reference

This document provides a quick reference to files that should be reviewed for potential cleanup or deprecation.

## 🚨 High Priority - Likely Duplicates

### OpenAPI Specifications
- `docs/openapi.yaml` (1,295 lines) - **Likely duplicate**
- `docs/newopenapi.yaml` (1,275 lines) - **Keep (current)**
- `src/api/src/openapi.yaml` (35 lines) - **Investigate (incomplete?)**
- `src/mw/docs/backend-openapi.yaml` (1,295 lines) - **Likely duplicate**
- `src/mw/docs/api/frontend-middleware-openapi.yaml` - **Keep (separate API)**

### Specification Files
- `docs/CertM3-MiddlewareAppServerSoftwareDesignSpecification.md` - **Likely duplicate**
- `src/mw/docs/specs/CertM3-MiddlewareAppServerSoftwareDesignSpecification.md` - **Keep**
- `docs/CertM3-Signer-SoftwareDesignSpwcification.md` - **Likely duplicate**
- `src/mw/docs/specs/CertM3-Signer-SoftwareDesignSpwcification.md` - **Keep**

## ⚠️ Medium Priority - Review Needed

### Design Documentation
- `docs/app-design.md` (229 lines) - **Review (may be outdated)**
- `docs/certm3-app-design.md` (983 lines) - **Keep (comprehensive)**
- `docs/design-docs.md` (685 lines) - **Review (may be outdated)**
- `docs/design-document.md` (7,460 lines) - **Review (may be outdated)**
- `docs/new-design.md` (3,634 lines) - **Keep (current)**

### API Documentation
- `docs/api-db-as-built.md` - **Review**
- `docs/api-documentation.md` - **Review**
- `docs/api-system-analysis.md` - **Review**
- `docs/frontend-api.md` - **Review**
- `docs/README-certM3-api.md` - **Review**

## 🔍 Low Priority - Development Notes

### App-Related (Potentially Deprecated)
- `docs/certm3-app-api-flow.md` - **Review (app deprecated)**
- `docs/certm3-app-creation-plan.md` - **Review (app deprecated)**
- `docs/README-app-deprecation.md` - **Keep (important notice)**
- `docs/app-api-discrepancies.txt` - **Review**

### Development and Planning
- `docs/clarifying-questions.md` - **Review**
- `docs/deferred-app-issues.md` - **Review**
- `docs/Issues.md` - **Review**
- `docs/new-oot-flow-for-app.md` - **Review**
- `docs/upgrade-v0.1.2-api-to-sign-certs.md` - **Review**

## ✅ Keep - Current and Relevant

### Configuration and Setup
- `docs/base-url-configuration.md` - **Keep**
- `docs/production-checklist.md` - **Keep**
- `docs/routing-path-changes.md` - **Keep**

## Quick Actions

### Run Analysis
```bash
./scripts/cleanup-documentation.sh
```

### Check Specific Files
```bash
# Compare OpenAPI specs
diff docs/openapi.yaml src/mw/docs/backend-openapi.yaml

# Check file sizes
wc -l docs/openapi.yaml docs/newopenapi.yaml src/api/src/openapi.yaml

# Search for references
grep -r "openapi.yaml" docs/
```

### Manual Review Checklist
- [ ] Test API specifications against running services
- [ ] Verify design documents match current architecture
- [ ] Check if development notes are still relevant
- [ ] Ensure no broken references after cleanup
- [ ] Update documentation index/README if needed

## Notes
- Files marked as "Likely duplicate" should be compared with `diff` before removal
- Files marked as "Review" should be examined for current relevance
- Always backup files before removal
- Consider creating `docs/archive/` or `docs/development/` directories for historical files 
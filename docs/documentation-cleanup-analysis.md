# Documentation and API Cleanup Analysis

## Overview
This document analyzes the certM3 repository to identify potentially deprecated, duplicate, or outdated documentation and API specification files that could be cleaned up for the release.

## ⚠️ Important Deployment Note
**Cert Signer Socket Permissions**: The middleware cert signer socket cannot be recreated without root privileges. This affects API testing and deployment procedures. See `docs/deployment-notes.md` for details.

## Analysis Results

### 1. OpenAPI Specification Files

#### Identified Files:
- `docs/openapi.yaml` (1,295 lines)
- `docs/newopenapi.yaml` (1,275 lines) 
- `src/api/src/openapi.yaml` (35 lines)
- `src/mw/docs/backend-openapi.yaml` (1,295 lines)
- `src/mw/docs/api/frontend-middleware-openapi.yaml`

#### Analysis:
- **`docs/openapi.yaml` vs `docs/newopenapi.yaml`**: These appear to be different versions of the same specification. The "new" version has minor differences including different endpoints and controller names.
- **`docs/openapi.yaml` vs `src/mw/docs/backend-openapi.yaml`**: These are nearly identical (only 1 line difference), suggesting one is a duplicate.
- **`src/api/src/openapi.yaml`**: This is a much smaller file (35 lines) and appears to be a partial or incomplete specification.
- **`src/mw/docs/api/frontend-middleware-openapi.yaml`**: This appears to be a separate specification for the middleware frontend API.

#### Recommendations:
- **Keep**: `docs/newopenapi.yaml` (appears to be the most current)
- **Keep**: `src/mw/docs/api/frontend-middleware-openapi.yaml` (separate middleware API)
- **Consider removing**: `docs/openapi.yaml` (duplicate of backend-openapi.yaml)
- **Consider removing**: `src/mw/docs/backend-openapi.yaml` (duplicate of docs/openapi.yaml)
- **Investigate**: `src/api/src/openapi.yaml` (incomplete specification)

### 2. Design Documentation Files

#### Identified Files:
- `docs/app-design.md` (229 lines)
- `docs/certm3-app-design.md` (983 lines)
- `docs/design-docs.md` (685 lines)
- `docs/design-document.md` (7,460 lines)
- `docs/new-design.md` (3,634 lines)

#### Analysis:
- **`docs/app-design.md`**: Focuses on web application design with Semantic UI and Handlebars
- **`docs/certm3-app-design.md`**: Much more comprehensive design document covering SPA architecture, PM2 configuration, nginx setup
- **`docs/design-document.md`**: Large design document (7,460 lines)
- **`docs/new-design.md`**: Appears to be a newer design iteration
- **`docs/design-docs.md`**: Smaller design documentation file

#### Recommendations:
- **Keep**: `docs/certm3-app-design.md` (most comprehensive and current)
- **Keep**: `docs/new-design.md` (appears to be current)
- **Consider consolidating**: `docs/app-design.md`, `docs/design-docs.md`, `docs/design-document.md` into the main design documents

### 3. API Documentation Files

#### Identified Files:
- `docs/api-db-as-built.md`
- `docs/api-documentation.md`
- `docs/api-system-analysis.md`
- `docs/frontend-api.md`
- `docs/README-certM3-api.md`

#### Analysis:
- Multiple API documentation files may cover overlapping content
- Some may be outdated given the current architecture

#### Recommendations:
- Review each file for current relevance
- Consolidate overlapping content
- Remove outdated API documentation

### 4. Specification Files (Potential Duplicates)

#### Identified Files:
- `docs/CertM3-MiddlewareAppServerSoftwareDesignSpecification.md`
- `src/mw/docs/specs/CertM3-MiddlewareAppServerSoftwareDesignSpecification.md`
- `docs/CertM3-Signer-SoftwareDesignSpwcification.md`
- `src/mw/docs/specs/CertM3-Signer-SoftwareDesignSpwcification.md`

#### Analysis:
- The specification files in `docs/` and `src/mw/docs/specs/` are nearly identical
- Only minor differences (1 line in middleware spec)
- These appear to be duplicates

#### Recommendations:
- **Keep**: `src/mw/docs/specs/` versions (closer to the code)
- **Remove**: `docs/` versions (duplicates)

### 5. App-Related Documentation

#### Identified Files:
- `docs/certm3-app-api-flow.md`
- `docs/certm3-app-creation-plan.md`
- `docs/README-app-deprecation.md`
- `docs/app-api-discrepancies.txt`

#### Analysis:
- `docs/README-app-deprecation.md` explicitly states that `src/app` is deprecated
- Other files may reference the deprecated app architecture

#### Recommendations:
- **Keep**: `docs/README-app-deprecation.md` (important deprecation notice)
- **Review**: Other app-related files for current relevance
- **Remove**: Files that only reference deprecated `src/app` functionality

### 6. Development and Planning Files

#### Identified Files:
- `docs/clarifying-questions.md`
- `docs/deferred-app-issues.md`
- `docs/Issues.md`
- `docs/new-oot-flow-for-app.md`
- `docs/upgrade-v0.1.2-api-to-sign-certs.md`

#### Analysis:
- These appear to be development notes, planning documents, and issue tracking
- May not be relevant for final release documentation

#### Recommendations:
- **Review**: Each file for current relevance
- **Consider moving**: To a separate `docs/development/` or `docs/archive/` directory
- **Remove**: Outdated planning documents

### 7. Configuration and Setup Files

#### Identified Files:
- `docs/base-url-configuration.md`
- `docs/production-checklist.md`
- `docs/routing-path-changes.md`

#### Analysis:
- These appear to be current and relevant configuration documentation

#### Recommendations:
- **Keep**: These appear to be current and useful

## Summary of Recommendations

### Files to Remove from Git Tracking:
1. **Duplicate OpenAPI specs**: `docs/openapi.yaml` or `src/mw/docs/backend-openapi.yaml`
2. **Duplicate specifications**: `docs/CertM3-*.md` files (keep `src/mw/docs/specs/` versions)
3. **Incomplete API spec**: `src/api/src/openapi.yaml` (if incomplete)
4. **Outdated design docs**: `docs/app-design.md`, `docs/design-docs.md`, `docs/design-document.md`
5. **Development notes**: Various planning and issue tracking files

### Files to Keep:
1. **Current OpenAPI specs**: `docs/newopenapi.yaml`, `src/mw/docs/api/frontend-middleware-openapi.yaml`
2. **Current design docs**: `docs/certm3-app-design.md`, `docs/new-design.md`
3. **Current config docs**: `docs/base-url-configuration.md`, `docs/production-checklist.md`
4. **Deprecation notices**: `docs/README-app-deprecation.md`

### Files to Review:
1. **API documentation**: All files in section 3
2. **Development files**: All files in section 6
3. **App-related files**: All files in section 5

## Next Steps

1. **Review each file** in the "Review" categories to determine current relevance
2. **Test API specifications** to ensure they match current implementation
3. **Consolidate overlapping documentation** where appropriate
4. **Create archive directory** for historical but not current documentation
5. **Update references** in remaining documentation to point to correct files
6. **Remove identified duplicates** and outdated files

## Notes

- This analysis is based on file names, sizes, and content sampling
- Some files may be more current than their names suggest
- API specifications should be tested against actual running services
- Consider the impact on existing documentation references before removal 
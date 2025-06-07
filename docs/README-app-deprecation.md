# Deprecation Notice: src/app

## Overview
The `src/app` directory has been deprecated as of version 1.2.0. This directory contained the original frontend application implementation which has been replaced by the new middleware (`src/mw`) and API (`src/api`) components.

## Timeline
- **v1.2.0**: Initial deprecation
- **v1.3.0**: Planned removal (tentative)

## Migration Path
The functionality previously provided by `src/app` has been split into two main components:

1. **Middleware (`src/mw`)**: 
   - Handles certificate signing operations
   - Manages Unix domain socket communication
   - Provides core security features

2. **API (`src/api`)**:
   - Provides RESTful endpoints
   - Handles user authentication
   - Manages certificate requests

## Backup
A backup of the original `src/app` code has been preserved in `src/app.deprecated` for reference purposes. This backup is not maintained and should not be used in production.

## Documentation
For details about the new architecture, please refer to:
- `docs/CertM3-MiddlewareAppServerSoftwareDesignSpecification.md`
- `docs/CertM3-Signer-SoftwareDesignSpwcification.md`
- `docs/frontend-api.md`

## Support
If you need assistance migrating from the old `src/app` implementation to the new architecture, please refer to the documentation or open an issue in the repository. 
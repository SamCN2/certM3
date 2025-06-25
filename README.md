# CertM3 - Certificate Management System

CertM3 is a comprehensive certificate management system designed to handle the lifecycle of digital certificates. The system is built with a modular architecture consisting of three main components:

## System Components

### 1. API Service (`src/api`) - Pretty mature, but missing one group path
The core backend service that provides RESTful APIs for certificate management. Built with LoopBack 4 and TypeScript, it handles:
- User and group management
- Certificate metadata (creation, validation, revocation)
- Request processing
- Role-based access control

### 2. Middleware Application (`src/mw`) - Working.
A go middleware.  Isolates the backend from the front.
- Really could be eliminated, but go let's us do a really cool signer sub-app.
- CSR signing and component (OID) management.
- Rate Limiting and JWT management.

### 3. Web Application (`src/web`) - Almost Working.  Rough edges!
A user-friendly web interface for certificate management. 
- Progressive SPA
- Collects basic user info
- Forms for email validation
- Create private key for CSR
- Key never leaves browser - Server convenience with DIY security.
- Certificate downloading and PKCS12 wrapping for browser inserttion.

### 3. Admin Interface (`src/admin`) - Coming Soon
A dedicated administrative interface for CertM3 management. Planned features include:
- User and group administration
- Certificate oversight
- System configuration
- Audit logging

## Current Status

The API service is currently operational and provides the following functionality:
- User management (CRUD operations)
- Group management with role-based access
- Certificate lifecycle management
- Request processing workflow
- Health monitoring endpoints

## Future Development

The system is being developed in phases:
1. ✅ API Service (Current)
2. ✅ Middleware (Current)
3. 🔄 Web Application (Current)
4. 📅 Admin Interface (Planned)

## Getting Started

### Quick Installation

For a fully automated installation on a fresh system:

```bash
git clone https://github.com/your-org/certM3.git
cd certM3
./scripts/fresh-install.sh
```

### Development Setup

**For development, you can use CertM3 as-is!** The default domain `urp.ogt11.com` resolves to `127.0.0.1` and `::1`, making it perfect for local development while still using proper FQDNs.

Simply add to your `/etc/hosts` file:
```
127.0.0.1 urp.ogt11.com
::1 urp.ogt11.com
```

This allows you to use HTTPS with proper certificates and test the full production-like setup without any configuration changes.

### Manual Installation

For detailed installation instructions, see:
- **[Installation Guide](Install/README.md)** - Complete setup instructions
- **[Database Setup](Install/database-setup.md)** - PostgreSQL configuration with mTLS
- **[CA Management](../CA-mgmt/README.md)** - Certificate Authority setup

### Prerequisites
- **Operating System**: Linux (Ubuntu 20.04+, CentOS 8+, or similar)
- **Go**: Version 1.21 or later
- **Node.js**: Version 18 or later
- **PostgreSQL**: Version 14 or later
- **OpenSSL**: Latest version

### Verification

After installation, verify your setup:

```bash
./scripts/verify-build.sh
```

This script checks all dependencies and builds all components.

## Configuration

The API service uses environment-based configuration managed through `src/api/src/config.ts`. The configuration includes:

- API settings (prefix, port, host)
- Database connection details
- Environment-specific settings

### Environment Selection
The service automatically selects the appropriate configuration based on the `NODE_ENV` environment variable:
- `development` (default)
- `production`

Example usage:
```bash
# Development environment (default)
npm start

# Production environment
NODE_ENV=production npm start
```

### Configuration Structure
```typescript
interface ApiConfig {
  api: {
    prefix: string;    // API route prefix (e.g., '/api')
    port: number;      // Server port
    host: string;      // Server host
  };
  database: {
    host: string;      // Database host
    port: number;      // Database port
    database: string;  // Database name
    username: string;  // Database username
    password: string;  // Database password
  };
}
```

## Documentation

- **[Installation Guide](Install/README.md)** - Complete setup instructions
- **[Database Setup](Install/database-setup.md)** - PostgreSQL configuration
- **[CA Management](../CA-mgmt/README.md)** - Certificate Authority management
- **[Base URL Configuration](docs/base-url-configuration.md)** - Domain customization guide
- **[Production Checklist](../docs/production-checklist.md)** - Production deployment guide
- **[API Documentation](../docs/api-documentation.md)** - API reference
- **API Explorer**: Available at `/explorer` when the API is running
- **OpenAPI Spec**: Available at `/openapi.json` when the API is running

## License

This project is licensed under the MPL-2.0 License - see the LICENSE file for details.

## Author

ogt11.com,llc 

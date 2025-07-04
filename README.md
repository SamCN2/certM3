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
./scripts/install-dependencies.sh  # Install system dependencies
./scripts/certm3_setup.sh          # Set up application and database
```

### FQDN Configuration

CertM3 uses FQDNs throughout the system for proper SSL/TLS configuration. You have two options:

#### Option 1: Use Default Development Domain (Recommended for Development)

**For development, you can use CertM3 as-is!** The default domain `urp.ogt11.com` resolves to `127.0.0.1` and `::1`, making it perfect for local development while still using proper FQDNs.

#### Option 2: Configure Your Own Domain

Use the interactive FQDN configuration script:

```bash
./scripts/configure-fqdn.sh
```

This script will:
- Replace all occurrences of the default domain with your domain
- Guide you through SSL certificate setup
- Help with DNS configuration
- Provide verification steps

This allows you to use HTTPS with proper certificates and test the full production-like setup without any configuration changes.

### Nginx Configuration

After configuring the FQDN, you need to update the nginx configuration with the correct paths for your system:

```bash
./scripts/configure-nginx-paths.sh
```

This script will:
- Update hardcoded paths in the nginx configuration
- Configure project root, SSL certificate, and CA certificate paths
- Validate the nginx configuration syntax
- Create backups of the original configuration

**Note**: Run this script after `configure-fqdn.sh` to ensure all paths are correctly set for your deployment.

### Development Setup

#### Step 1: DNS Configuration (if using default domain)

Add to your `/etc/hosts` file:
```
127.0.0.1 urp.ogt11.com
::1 urp.ogt11.com
```

#### Step 2: SSL Certificate Setup

Since you won't have access to the `urp.ogt11.com` SSL certificate, create a self-signed certificate:

```bash
# Create certificate directory
sudo mkdir -p /etc/certs/urp.ogt11.com

# Generate self-signed certificate for urp.ogt11.com
sudo openssl req -x509 -newkey rsa:4096 -keyout /etc/certs/urp.ogt11.com/privkey.pem -out /etc/certs/urp.ogt11.com/fullchain.pem -days 365 -nodes -subj "/CN=urp.ogt11.com"

# Set proper permissions
sudo chmod 644 /etc/certs/urp.ogt11.com/fullchain.pem
sudo chmod 600 /etc/certs/urp.ogt11.com/privkey.pem
```

#### Step 3: Browser Certificate Acceptance

When you first access `https://urp.ogt11.com`, your browser will show a security warning. Click "Advanced" and "Proceed to urp.ogt11.com (unsafe)" - this is safe for development since you control the domain.

This allows you to use HTTPS with proper certificates and test the full production-like setup without any configuration changes.

### Building the SPA Frontend

The web application is a Single Page Application (SPA) built with TypeScript and esbuild. To build the frontend:

```bash
# Build the SPA (installs dependencies and compiles to static/)
./scripts/build-spa.sh
```

Or manually:
```bash
cd src/web
npm install
npm run build
```

The build process:
- Compiles TypeScript to JavaScript
- Bundles dependencies using esbuild
- Copies all static files to the top-level `static/` directory
- Includes vendor libraries (forge.min.js for cryptography)

**Note**: The `static/` directory is generated by the build process and should not be committed to git. The build script ensures it's always up-to-date.

### Testing and Development

#### Middleware Test Harness (`src/web/proto/`)

The `src/web/proto/` directory contains TypeScript unit tests for the middleware layer. These tests are valuable for:

- **Middleware Validation**: Comprehensive testing of all middleware endpoints
- **Code Reusability**: TypeScript tests can be adapted for web app client-side testing
- **API Reference**: Working examples of API calls, data structures, and authentication patterns
- **Development**: Foundation for web app integration testing

The test code demonstrates:
- Proper API client implementation
- Request/response data structures
- Error handling patterns
- JWT and mTLS authentication
- CSR generation and signing workflows

**Note**: These TypeScript tests can be copied to the web app and adapted for client-side testing by removing Node.js dependencies and using web-compatible libraries.

### Manual Installation

For detailed installation instructions, see:
- **[Installation Guide](Install/README.md)** - Complete setup instructions
- **[Database Setup](Install/database-setup.md)** - PostgreSQL configuration with mTLS
- **[CA Management](../CA-mgmt/README.md)** - Certificate Authority setup

### Prerequisites
- **Operating System**: Linux (Ubuntu 20.04+, CentOS 8+, or similar)
- **Go**: Version 1.21 or later
- **Node.js**: Version 18 or later (Node.js 22+ supported with compatibility flags)
- **PostgreSQL**: Version 14 or later
- **OpenSSL**: Latest version

**Note**: The installation scripts use `--legacy-peer-deps` and `--ignore-engines` flags for npm to handle compatibility with newer Node.js versions and LoopBack 4 packages. This ensures the system works across different Node.js versions while maintaining functionality.

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

## Scripts Reference

### Installation Scripts
- `scripts/install-dependencies.sh` - Install system dependencies (Go, Node.js, PostgreSQL)
- `scripts/certm3_setup.sh` - Set up application, database, and services
- `scripts/verify-build.sh` - Verify installation and build all components

### Configuration Scripts
- `scripts/configure-fqdn.sh` - Interactive FQDN configuration
- `scripts/configure-nginx-paths.sh` - Configure nginx paths for your system
- `scripts/template-fqdn.sh` - Advanced FQDN templating (template/restore modes)
- `scripts/configure-base-url.sh` - Legacy base URL configuration

### Database Scripts
- `scripts/create_certm3_schema.sql` - Database schema creation
- `scripts/get-db-schema.sh` - Generate database documentation

### Deployment Scripts
- `scripts/deploy.sh` - Production deployment script
- `ecosystem.config.js` - PM2 process management configuration

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

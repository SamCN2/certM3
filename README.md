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

### Prerequisites
- Node.js 20 or later
- PostgreSQL 14 or later
- golang 1.24
- PM2
- systemd

### API Service Setup
```bash
pm2 start ecosystem.config.js
```

The API will be available at `http://localhost:3000`.

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

- API Documentation: Available at `/openapi.json` when the API is running
- API Explorer: Available at `/explorer` when the API is running

## License

This project is licensed under the MPL-2.0 License - see the LICENSE file for details.

## Author

ogt11.com,llc 

# CertM3 Frontend

This is the frontend application for CertM3, a certificate management system. The application is built using TypeScript and provides a simple interface for requesting and managing certificates.

## Features

- Initial certificate request with username and email
- Email validation with challenge token
- Group selection for certificate attributes
- Certificate generation with private key
- PKCS12 package creation and download

## Security

The application follows strict security practices:
- Private keys are generated and used only in the browser
- Private keys are never transmitted to the server
- PKCS12 passphrases are only used locally and never stored
- All sensitive operations are performed client-side

## Configuration

The application uses a central configuration file (`config.json`) to manage important settings:

```json
{
  "baseDir": "../../static",    // Output directory for built files
  "baseUrl": "/certm3",        // Base URL for the application
  "apiBaseUrl": "/app"         // Base URL for API endpoints
}
```

These settings are used throughout the application to ensure consistent paths and URLs.

## Application Structure

The application is a single-page application (SPA) with the following structure:

1. Base Path (`/certm3`):
   - Handled by the reverse proxy (nginx)
   - Serves the static files for the SPA
   - No server-side routing

2. API Endpoints (`/app/*`):
   - Handled by the backend middleware
   - Real server endpoints for certificate operations

3. Client-side Routes:
   - All application navigation is handled in JavaScript
   - No server-side routing for application views
   - Single HTML entry point (`test.html`)

## Development

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the application:
   ```bash
   npm run build
   ```
   This will compile the TypeScript files and copy them to the configured `baseDir`.

3. For development with watch mode:
   ```bash
   npm run dev
   ```

### Testing

1. Build the application:
   ```bash
   npm run build
   ```

2. Access the application at `https://urp.ogt11.com/certm3/test.html`

3. Follow the steps in the UI:
   - Enter username and email
   - Validate email with challenge token
   - Select groups for the certificate
   - Generate and download the certificate

## API Endpoints

The application communicates with the following API endpoints:

- `POST /app/request` - Submit initial certificate request
- `POST /app/validate` - Validate email with challenge token
- `GET /app/validate/:requestId/:challengeToken` - Validate from direct link
- `POST /app/csr` - Submit CSR and get signed certificate
- `GET /app/groups` - Get available groups

## Project Structure

```
src/
  core/
    api.ts       - API service for server communication
    crypto.ts    - Cryptographic operations
    state.ts     - State management
    types.ts     - TypeScript type definitions
    certificate.ts - Certificate service
  test.html     - Test interface
config.json     - Application configuration
```

## Build Process

1. TypeScript files are compiled to JavaScript in the `dist` directory
2. Compiled files and HTML are copied to the configured `baseDir`
3. The application is served from the configured `baseUrl`
4. All API requests are prefixed with the configured `apiBaseUrl`

## Notes

- The application uses `node-forge` for cryptographic operations
- All API calls are made using Axios
- The application is designed to be simple and focused on core functionality
- The test interface provides a way to verify all features work as expected
- All application navigation is handled client-side - there is no server-side routing 
# CertM3 Application Design Document

## 1. Architecture Overview

### 1.1 Single Page Application (SPA) Decision
Yes, this will be a Single Page Application (SPA) using vanilla JavaScript for the following reasons:
- Seamless user experience during the multi-step certificate request process
- Client-side key generation and CSR creation
- No need for full page reloads between steps
- Better state management for the multi-step process
- Improved security by keeping private key operations in the browser
- Minimal dependencies and bundle size
- Direct access to browser APIs
- Simple maintenance and updates

### 1.2 Project Structure
```
certM3/                      # Project root
├── ecosystem.config.js      # PM2 process manager configuration
├── src/                     # Source code
│   ├── api/                # Existing Loopback-4 API (for ref, not for touching)
│   └── app/                # Web application root
│       ├── js/            # Frontend JavaScript
│       │   ├── views/     # View classes
│       │   ├── services/  # API client services
│       │   │   ├── loopback.ts  # Loopback 4 API client
│       │   │   └── crypto.ts    # Crypto operations
│       │   └── utils/     # Utility functions
│       ├── css/           # Stylesheets
│       └── index.html     # Main HTML file
├── static/                 # Static content served by nginx
│   ├── css/               # Compiled CSS
│   ├── js/                # Compiled JavaScript
│   └── assets/            # Images, fonts, etc.
├── nginx/                  # Nginx configuration
│   └── certm3.conf        # Nginx configuration (managed by systemctl)
└── docs/                   # Documentation
    ├── api-documentation.md  # Loopback 4 API documentation
    └── openapi.yaml         # OpenAPI specification
```

### 1.3 Service Architecture
- **Loopback 4 API**: Port 3000 (PM2 managed) - `/api/*` routes
- **Web Application**: Port 3001 (PM2 managed) - `/app/*` routes
- **Admin Interface**: Port 3002 (PM2 managed)
- **Nginx**: Managed by systemctl, handles routing and static content

### 1.4 PM2 Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'certm3-api',
      script: 'src/api/dist/server.js',  // Loopback 4 API
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'certm3-app',
      script: 'src/app/dist/server.js',  // Web application
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        LOOPBACK_API_URL: 'http://urp.ogt11.com/api/'  // Loopback 4 API URL
      }
    },
    {
      name: 'certm3-admin',
      script: 'src/admin/dist/server.js',  // Admin interface
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      }
    }
  ]
};
```

### 1.5 Nginx Configuration
The nginx configuration in `nginx/certm3.conf` will be managed by systemctl. During development:
1. Changes to nginx configuration will be suggested
2. Configuration will be reviewed and moved into place
3. Nginx will be restarted via systemctl

Key routing rules:
- `/api/*` -> Loopback 4 API (port 3000)
- `/app/*` -> Web Application (port 3001)
- `/admin/*` -> Admin Interface (port 3002)
- `/static/*` -> Static content directory

### 1.6 JavaScript Requirements
JavaScript is essential for core functionality:
1. **Required Features**:
   - Key pair generation (Web Crypto API)
   - CSR creation
   - PKCS#12 bundle generation
   - Certificate installation
   - Real-time validation

2. **Fallback Behavior**:
   - Home page (`/app`) provides basic information without JavaScript
   - All other routes require JavaScript
   - Clear messaging about JavaScript requirements
   - Browser compatibility information

3. **Browser Support**:
   - Modern browsers with Web Crypto API support
   - Clear minimum version requirements
   - Feature detection for critical APIs

### 1.6 Static Content Handling
- Static content is served directly by nginx from the `/static` directory
- Nginx configuration maps `/static/*` to the static directory
- Express server handles SPA routing
- Build process compiles and copies assets to static directory

### 1.3 Fallback Home Page
The application includes a fallback home page at `/` that provides manual navigation for browsers that don't support SPA features or when JavaScript is disabled. This ensures accessibility and graceful degradation.

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CertM3 - Certificate Management</title>
    <link rel="stylesheet" href="/static/css/styles.css">
</head>
<body>
    <header>
        <h1>CertM3 Certificate Management</h1>
        <nav>
            <ul>
                <li><a href="/app/request">New Certificate Request</a></li>
                <li><a href="/app/validate">Validate Email</a></li>
                <li><a href="/app/certificate">Generate Certificate</a></li>
                <li><a href="/admin">Admin Interface</a></li>
            </ul>
        </nav>
    </header>

    <main>
        <section class="browser-support">
            <h2>Browser Support</h2>
            <p>This application is tested with:</p>
            <ul>
                <li>Firefox (latest)</li>
                <li>Chromium (latest)</li>
            </ul>
            <p>For the best experience, please use one of these browsers.</p>
        </section>

        <section class="manual-steps">
            <h2>Manual Steps</h2>
            <ol>
                <li>
                    <h3>Request Certificate</h3>
                    <p>Start by requesting a new certificate. You'll need:</p>
                    <ul>
                        <li>Username</li>
                        <li>Email address</li>
                        <li>Display name</li>
                    </ul>
                    <a href="/app/request" class="button">Start Request</a>
                </li>
                <li>
                    <h3>Validate Email</h3>
                    <p>Check your email for the validation link, or enter your token manually.</p>
                    <a href="/app/validate" class="button">Validate Email</a>
                </li>
                <li>
                    <h3>Generate Certificate</h3>
                    <p>Once validated, generate your certificate.</p>
                    <a href="/app/certificate" class="button">Generate Certificate</a>
                </li>
            </ol>
        </section>
    </main>

    <footer>
        <p>If you experience any issues, please contact support.</p>
    </footer>

    <!-- SPA initialization -->
    <script>
        // Check for SPA support
        if (window.history && window.history.pushState) {
            // Initialize SPA
            const app = new CertM3App();
        } else {
            // Show fallback message
            document.querySelector('.browser-support').style.display = 'block';
        }
    </script>
</body>
</html>
```

#### Fallback Features
1. **Manual Navigation**:
   - Direct links to each step
   - Clear instructions for each process

2. **Browser Support**:
   - Clear indication of supported browsers
   - Graceful degradation for unsupported browsers
   - Manual process instructions

3. **Progressive Enhancement**:
   - Enhanced features when SPA is supported
   - Clear user feedback

4. **Accessibility**:
   - Semantic HTML structure
   - Clear navigation
   - Screen reader friendly
   - Keyboard navigation support

### 1.4 UI Framework and Styling
The application uses Semantic UI for styling and components, combined with vanilla JavaScript for functionality. This provides a modern, responsive interface while maintaining our lightweight approach.

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CertM3 - Certificate Management</title>
    <!-- Semantic UI CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/semantic-ui@2.4.2/dist/semantic.min.css">
    <!-- Custom styles -->
    <link rel="stylesheet" href="/static/css/styles.css">
</head>
<body>
    <div class="ui container">
        <header class="ui segment">
            <h1 class="ui header">CertM3 Certificate Management</h1>
            <div class="ui secondary menu">
                <a class="item" href="/app/request">
                    <i class="plus icon"></i> New Certificate
                </a>
                <a class="item" href="/app/validate">
                    <i class="check icon"></i> Validate Email
                </a>
                <a class="item" href="/app/certificate">
                    <i class="certificate icon"></i> Generate Certificate
                </a>
                <a class="item" href="/admin">
                    <i class="settings icon"></i> Admin
                </a>
            </div>
        </header>

        <main>
            <div class="ui segment">
                <div class="ui info message">
                    <div class="header">Browser Support</div>
                    <p>This application is tested with:</p>
                    <ul class="list">
                        <li>Firefox (latest)</li>
                        <li>Chromium (latest)</li>
                    </ul>
                </div>

                <div class="ui steps">
                    <div class="step">
                        <i class="plus icon"></i>
                        <div class="content">
                            <div class="title">Request Certificate</div>
                            <div class="description">Enter your details</div>
                        </div>
                    </div>
                    <div class="step">
                        <i class="check icon"></i>
                        <div class="content">
                            <div class="title">Validate Email</div>
                            <div class="description">Confirm your email</div>
                        </div>
                    </div>
                    <div class="step">
                        <i class="certificate icon"></i>
                        <div class="content">
                            <div class="title">Generate Certificate</div>
                            <div class="description">Get your certificate</div>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <footer class="ui segment">
            <p>Copyright 2025 ogt11.com, llc</p>
        </footer>
    </div>

    <!-- Semantic UI JS -->
    <script src="https://cdn.jsdelivr.net/npm/semantic-ui@2.4.2/dist/semantic.min.js"></script>
    <!-- Application JS -->
    <script src="/static/js/app.js"></script>
</body>
</html>
```

#### Semantic UI Integration
1. **Component Usage**:
   - Use Semantic UI classes for styling
   - Leverage built-in components (modals, forms, messages)
   - Maintain consistent look and feel
   - Responsive design out of the box

2. **Form Handling**:
```javascript
class RequestForm {
    constructor() {
        this.form = document.querySelector('.ui.form');
        this.setupValidation();
    }

    setupValidation() {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (this.validateForm()) {
                await this.submitForm();
            }
        });
    }

    validateForm() {
        // Use Semantic UI's form validation
        $(this.form).form({
            fields: {
                username: {
                    identifier: 'username',
                    rules: [
                        {
                            type: 'empty',
                            prompt: 'Please enter a username'
                        }
                    ]
                },
                email: {
                    identifier: 'email',
                    rules: [
                        {
                            type: 'email',
                            prompt: 'Please enter a valid email'
                        }
                    ]
                }
            }
        });
        return $(this.form).form('is valid');
    }
}
```

3. **Modal Dialogs**:
```javascript
class ModalManager {
    static showError(message) {
        $('.ui.modal.error')
            .modal({
                closable: true,
                onShow: () => {
                    $('.ui.modal.error .content').text(message);
                }
            })
            .modal('show');
    }

    static showSuccess(message) {
        $('.ui.modal.success')
            .modal({
                closable: true,
                onShow: () => {
                    $('.ui.modal.success .content').text(message);
                }
            })
            .modal('show');
    }
}
```

4. **Loading States**:
```javascript
class LoadingManager {
    static show() {
        $('.ui.dimmer').addClass('active');
    }

    static hide() {
        $('.ui.dimmer').removeClass('active');
    }
}
```

#### Benefits of This Approach
1. **Modern UI**:
   - Professional look and feel
   - Consistent design language
   - Responsive components
   - Built-in animations

2. **Lightweight**:
   - No framework overhead
   - Direct DOM manipulation
   - Simple state management
   - Easy debugging

3. **Progressive Enhancement**:
   - Works without JavaScript
   - Enhanced with JS features
   - Graceful degradation
   - Accessible by default

4. **Maintenance**:
   - Clear separation of concerns
   - Easy to update styles
   - Simple component structure
   - Minimal dependencies

### 1.7 Development Environment
The application is developed with TLS-first approach:

1. **Development Domain**:
   - `urp.ogt11.com` resolves to `::1` and `127.0.0.1`
   - Valid TLS certificate for development
   - All development should use HTTPS

2. **Development Modes**:
   - **TLS Mode** (Default):
     - Access via `https://urp.ogt11.com`
     - Full TLS end-to-end
     - Matches production environment
     - Required for Web Crypto API
   
   - **Raw Mode** (Debug):
     - Access via `http://localhost:{port}`
     - Used for initial setup/debugging
     - Limited functionality (no Web Crypto API)
     - Not recommended for normal development

3. **PM2 Development Configuration**:
```javascript
// ecosystem.config.js (development)
module.exports = {
  apps: [
    {
      name: 'certm3-api',
      script: 'src/api/dist/server.js',
      instances: 1,
      autorestart: true,
      watch: true,
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        TLS_MODE: true
      }
    },
    {
      name: 'certm3-app',
      script: 'src/app/dist/server.js',
      instances: 1,
      autorestart: true,
      watch: true,
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        LOOPBACK_API_URL: 'https://urp.ogt11.com/api',
        TLS_MODE: true
      }
    }
  ]
};
```

4. **Nginx Development Configuration**:
```nginx
# nginx/certm3.conf (development)
server {
    listen 443 ssl;
    server_name urp.ogt11.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # API routes
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # App routes
    location /app/ {
        proxy_pass http://localhost:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Static content
    location /static/ {
        alias /path/to/static/;
    }
}
```

5. **Development Workflow**:
   - Always develop with TLS enabled
   - Use `urp.ogt11.com` for testing
   - Only use raw mode for initial debugging
   - Test Web Crypto API functionality in TLS mode
   - Ensure all API calls use HTTPS

## 2. User Flow

### 2.1 Initial Request (`/`)
1. User enters:
   - Username (with real-time validation)
   - Email address
   - Display name
2. Real-time username validation against both users and requests tables
3. On submission:
   - Creates pending request in database
   - Triggers email validation
   - Redirects to validation page

### 2.2 Email Validation (`/validate/:token`)
1. User arrives via email link or manual entry
2. System validates token against request database
3. On success:
   - Creates user record
   - Adds user to "users" group
   - Marks request as completed
   - Redirects to certificate page

### 2.3 Certificate Generation (`/app/certificate`)
1. Client-side:
   - Generates key pair (never leaves browser)
   - Creates CSR with user info (username, display name, email)
   - Sends CSR to server
2. Server-side (Loopback 4 API):
   - Signs certificate (functionality to be tested with app)
   - Adds group memberships to SAN fields (initial group "users" only)
   - Returns signed certificate
3. Client-side:
   - Creates PKCS#12 bundle
   - Offers download to user
   - Integrates with platform key stores when available

Note: Both certificate signing and group membership are managed entirely by the Loopback 4 API. The web application's role is to:
- Request the user's current groups from the API
- Display available groups for selection
- Send group selection to the API
- Send CSR to the API for signing
- The API handles:
  - All group membership operations
  - SAN field generation
  - Certificate signing
  - These features will be tested during app development

### 2.4 Certificate Renewal
1. User returns to `/certificate`
2. If certificate expired:
   - Resets request to re-validating
   - Sends new email challenge
   - Follows new user flow
3. If certificate valid:
   - Shows available groups
   - Generates new certificate with selected groups

## 3. Technical Implementation

### 3.1 Frontend (Vanilla JavaScript)
```javascript
// app.js
class CertM3App {
  constructor() {
    this.currentView = null;
    this.views = {
      request: new RequestView(),
      validate: new ValidateView(),
      certificate: new CertificateView()
    };
    this.setupNavigation();
  }

  setupNavigation() {
    window.addEventListener('popstate', (e) => this.handleRoute(e.state));
    this.handleRoute(window.location.pathname);
  }

  handleRoute(path) {
    const view = path.split('/')[1] || 'request';
    this.showView(view);
  }

  showView(viewName) {
    if (this.currentView) {
      this.currentView.hide();
    }
    this.views[viewName].show();
    this.currentView = this.views[viewName];
  }
}

// View base class
class View {
  constructor(elementId) {
    this.element = document.getElementById(elementId);
  }

  show() {
    this.element.style.display = 'block';
  }

  hide() {
    this.element.style.display = 'none';
  }
}
```

### 3.2 Mobile Integration
```javascript
// mobile.js
class MobileIntegration {
  static async detectPlatform() {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) {
      return 'ios';
    } else if (/Android/.test(ua)) {
      return 'android';
    }
    return 'web';
  }

  static async handleCertificate(certificate) {
    const platform = await this.detectPlatform();
    switch (platform) {
      case 'ios':
        return this.handleIOSCertificate(certificate);
      case 'android':
        return this.handleAndroidCertificate(certificate);
      default:
        return this.handleWebCertificate(certificate);
    }
  }
}
```

### 3.3 Backend (Express + TypeScript)
```typescript
// API endpoints
router.post('/requests', createRequest);
router.post('/validate', validateRequest);
router.post('/certificates', generateCertificate);
router.get('/groups', getUserGroups);

// Database operations
interface Request {
  username: string;
  email: string;
  displayName: string;
  status: 'pending' | 'validating' | 'completed';
  validationToken: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  status: 'active' | 'inactive';
}

interface Certificate {
  id: string;
  userId: string;
  serialNumber: string;
  notBefore: Date;
  notAfter: Date;
  groups: string[];
}
```

### 3.4 Email Service
Two options:
1. **Integrated Service**:
   - Part of the Express backend
   - Simpler deployment
   - Direct database access
   - Easier debugging

2. **Separate Service**:
   - Independent microservice
   - Better scalability
   - Clearer separation of concerns
   - More complex deployment

Recommendation: Start with integrated service, migrate to separate service if needed.

#### Email Configuration
```typescript
interface EmailConfig {
  smtp_server: string;  // SMTP server address or "test" for development
  smtp_port: number;    // SMTP port
  smtp_user?: string;   // Optional SMTP username
  smtp_pass?: string;   // Optional SMTP password
  from_address: string; // Sender email address
  test_mode: boolean;   // Whether to use test mode
}

// Example configuration
const emailConfig: EmailConfig = {
  smtp_server: "test",  // Use "test" for development
  smtp_port: 25,
  from_address: "noreply@certm3.example.com",
  test_mode: true
};
```

#### Test Mode Implementation
When `smtp_server` is set to "test" or `test_mode` is true:
1. Emails are not sent via SMTP
2. Instead, email content is written to files in `/var/spool/certM3/test-emails/`
3. Each email is saved as a separate file with format:
   ```
   /var/spool/certM3/test-emails/
   ├── {timestamp}-{recipient}-{token}.eml
   ├── {timestamp}-{recipient}-{token}.eml
   └── ...
   ```
4. File naming convention:
   - `timestamp`: ISO 8601 format
   - `recipient`: Email address (sanitized for filesystem)
   - `token`: Validation token

Example test email file:
```text
From: noreply@certm3.example.com
To: user@example.com
Subject: CertM3 Email Validation
Date: 2024-03-20T10:00:00Z

Your validation token is: 123e4567-e89b-12d3-a456-426614174000

Click here to validate: https://certm3.example.com/validate/123e4567-e89b-12d3-a456-426614174000
```

This approach allows for:
1. Development without SMTP server
2. Easy testing of email content
3. Verification of token generation
4. Testing of validation flow
5. No risk of sending test emails to real addresses

## API Communication and Security

### App Server as API Gateway

The app server acts as a secure gateway between client-side code and the API service. This architecture provides several important benefits:

1. **Security**:
   - API credentials and endpoints are never exposed to the client
   - All API communication is server-to-server
   - Input validation and sanitization happens server-side
   - Rate limiting and other security measures can be implemented at the app server level

2. **Business Logic**:
   - Business rules and validation are enforced server-side
   - Complex operations can be orchestrated without client knowledge
   - Transaction management and error handling are centralized
   - Consistent error responses and status codes

3. **Flexibility**:
   - API implementation details can be changed without client updates
   - Caching and performance optimizations can be added server-side
   - Monitoring and logging can be implemented consistently
   - New security measures can be added without client changes

### Implementation Guidelines

1. **Client-Side Code**:
   - Should only communicate with the app server
   - Should not contain any API endpoints or credentials
   - Should handle user interface concerns only
   - Should not implement business logic

2. **App Server**:
   - Should implement all business logic
   - Should handle all API communication
   - Should validate and sanitize all input
   - Should provide consistent error handling
   - Should implement security measures

3. **API Service**:
   - Should only be accessible from the app server
   - Should not be directly accessible from the client
   - Should implement its own security measures
   - Should focus on data operations

### Example Flow

1. **Request Submission**:
   ```
   Client -> App Server -> API Service
   ```
   - Client sends form data to app server
   - App server validates input
   - App server makes API calls
   - App server returns formatted response

2. **Validation**:
   ```
   Client -> App Server -> API Service
   ```
   - Client sends validation data to app server
   - App server validates the request
   - App server generates JWT token
   - App server returns token and redirect URL

3. **Certificate Request**:
   ```
   Client -> App Server -> API Service
   ```
   - Client sends certificate request to app server
   - App server validates JWT token
   - App server makes API calls
   - App server returns certificate data

### Security Considerations

1. **Network Security**:
   - API service should be on a private network
   - Only app server should have access to API
   - Use internal DNS or IP addresses
   - Implement network-level security measures

2. **Authentication**:
   - JWT tokens for user sessions
   - API keys for server-to-server communication
   - Rate limiting for all endpoints
   - Input validation at all levels

3. **Monitoring**:
   - Log all API calls
   - Monitor for suspicious activity
   - Track rate limit violations
   - Alert on security events

## 4. Security Considerations

1. **Key Generation**:
   - Always in browser
   - Never transmitted to server
   - Uses Web Crypto API

2. **CSR Validation**:
   - Verify all required fields
   - Match against user data
   - Rate limiting

3. **Email Validation**:
   - Secure token generation
   - Token expiration
   - One-time use

4. **Certificate Signing**:
   - Proper CA key protection
   - Audit logging
   - Group membership verification

## 5. Deployment

### 5.1 Nginx Configuration
- Already set up in `certm3.conf`
- Handles routing to appropriate services
- SSL/TLS configuration
- Static file serving

### 5.2 Service Structure
```
/api          -> Express backend (port 3000)
/app          -> Static frontend (port 3001)
/admin        -> Admin interface (port 3002)
/email-service -> Email handling (port 3003 Maybe a MQ Maybe a standalone  Future)
```

## 6. Future Considerations

1. **Monitoring**:
   - Request tracking
   - Error logging
   - Performance metrics

2. **Scaling**:
   - Database optimization
   - Caching strategy
   - Load balancing

3. **Features**:
   - Certificate revocation
   - Group management
   - User profile management

## 7. Mobile and Cross-Platform Considerations

### 7.1 Mobile Web Support
- Responsive design using modern CSS
- Touch-friendly interfaces
- Mobile-optimized form inputs
- Support for mobile browsers' Web Crypto API

### 7.2 Native Mobile Integration
- Platform detection for appropriate handling
- Integration with platform-specific key stores:
  - iOS Keychain
  - Android Keystore
- Platform-specific certificate handling
- Mobile-specific security considerations

### 7.3 Cross-Platform Certificate Management
- Platform detection for appropriate handling
- Automatic routing to correct key store
- Platform-specific installation instructions
- Fallback mechanisms for unsupported platforms

### 7.4 Mobile-Specific Features
- QR code support for certificate sharing
- Mobile-friendly certificate viewing
- Touch-based certificate operations
- Mobile-optimized validation flows
- Push notification support for certificate expiry

### 7.5 Testing Strategy
- Cross-platform testing matrix
- Mobile browser compatibility testing
- Native platform integration testing
- Responsive design validation
- Touch interface testing 

### 1.7 Certificate Request and Signing Process

The application will consolidate the CSR generation and signing processes into a single page:

- **`/app/certificate` Page**:
  - This page will serve as the main interface for users to generate a CSR and sign it.
  - It will handle the entire process, including generating the CSR and sending it for signing, all within the same browser session.

- **`/app/cert-sign` Endpoint**:
  - This endpoint will handle the signing of the CSR and the delivery of the signed certificate.
  - It will be called by the `/app/certificate` page to process the CSR into a certificate.

- **No Redirects**:
  - The process will remain on the `/app/certificate` page, providing a seamless user experience without redirects.

### Benefits:
- **User Experience**: Users will have a streamlined experience, as they won't need to navigate between different pages or endpoints.
- **Simplicity**: The design simplifies the flow by keeping related operations together, reducing the complexity of the application.
- **Consistency**: This approach aligns with the SPA design, where the application handles state and processes without full page reloads.

### Considerations:
- **Error Handling**: Ensure robust error handling to manage any issues that arise during CSR generation or signing.
- **Security**: Validate and sanitize inputs to prevent security vulnerabilities, especially when handling cryptographic operations.
- **Feedback**: Provide clear feedback to users about the status of their request, especially if there are any delays or issues.

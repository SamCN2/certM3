#!/bin/bash

# Create a complete CertM3 package for distribution
set -e

echo "Creating CertM3 package..."

# Clean and recreate package directory
rm -rf pkg
mkdir -p pkg/{bin,etc,static,var/spool/certM3/logs,api}

# Build Go binaries
echo "Building Go binaries..."
cd src/mw
make build
cp bin/certm3-app ../../pkg/bin/
cp bin/certm3-signer ../../pkg/bin/
cd ../..

# Copy API files (using the unified config system)
echo "Copying API files..."
cp -r src/api/* pkg/api/
cd pkg/api
# Install dependencies for the API
if npm install --legacy-peer-deps; then
    echo "API dependencies installed successfully"
else
    echo "API dependencies failed to install"
    exit 1
fi

# Build the API
echo "Building API..."
if npm run build; then
    echo "API built successfully"
else
    echo "API build failed"
    exit 1
fi
cd ../..

# Copy static files
echo "Copying static files..."
cp -r static/* pkg/static/

# Copy configuration files
echo "Copying configuration files..."
cp config/config.default.yaml pkg/etc/
cp README.md pkg/

# Copy CA management scripts
echo "Copying CA management scripts..."
cp -r CA-mgmt pkg/

# Copy database setup scripts
echo "Copying database setup scripts..."
cp scripts/create_certm3_schema.sql pkg/
cp scripts/setup-database.sh pkg/

# Create simplified nginx config for package
echo "Creating nginx skeleton config..."
cat > pkg/etc/nginx.certm3-skeleton.conf << 'EOF'
# Skeleton nginx config for CertM3 package
# Copy or include this in your nginx config as needed

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name _;  # <-- Set your server_name here

    # SSL Configuration
    ssl_certificate     /etc/ssl/certs/your-cert.pem;   # <-- Set your cert path
    ssl_certificate_key /etc/ssl/private/your-key.pem;  # <-- Set your key path
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_session_timeout 10m;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Main static site (SPA or landing page)
    location = / {
        root /opt/certm3/pkg/static;
        index index.html;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # API endpoints
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }

    # Middleware app endpoints
    location /app/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }

    # Static files
    location /static/ {
        alias /opt/certm3/pkg/static/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
        try_files $uri $uri/ =404;
    }
}
EOF

# Create PM2 config for package (matching our working configuration)
echo "Creating PM2 config..."
cat > pkg/etc/certm3.pm2.config.js << 'EOF'
const path = require('path');

module.exports = {
  apps: [
    // API - use the actual Node.js entry point
    {
      name: 'certm3-api',
      script: 'api/dist/index.js',
      args: '--config ../config.yaml',
      cwd: 'api',
      watch: false,
      error_file: '../var/spool/certM3/logs/api-error.log',
      out_file: '../var/spool/certM3/logs/api-out.log',
      log_file: '../var/spool/certM3/logs/api-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '1G',
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
      env: { PORT: 3000 }
    },
    // Middleware app - use full path from pkg root
    {
      name: 'certm3-app',
      script: 'bin/certm3-app',
      args: '--config config.yaml',
      cwd: '.',
      watch: false,
      error_file: 'var/spool/certM3/logs/certm3-app-error.log',
      out_file: 'var/spool/certM3/logs/certm3-app-out.log',
      log_file: 'var/spool/certM3/logs/certm3-app-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '1G',
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
      env: { PORT: 8080 }
    },
    // Signer - use full path from pkg root
    {
      name: 'certm3-signer',
      script: 'bin/certm3-signer',
      args: '--config config.yaml',
      cwd: '.',
      watch: false,
      error_file: 'var/spool/certM3/logs/certm3-signer-error.log',
      out_file: 'var/spool/certM3/logs/certm3-signer-out.log',
      log_file: 'var/spool/certM3/logs/certm3-signer-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '1G',
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000
    }
  ]
};
EOF

# Create startup script
echo "Creating startup script..."
cat > pkg/start.sh << 'EOF'
#!/bin/bash

# Quick start script for CertM3
set -e

echo "Starting CertM3 services..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "PM2 not found. Installing..."
    npm install -g pm2
fi

# Create log directories
mkdir -p var/spool/certM3/logs

# Check if config.yaml exists, if not create from default
if [ ! -f "config.yaml" ]; then
    echo "Creating config.yaml from default..."
    cp etc/config.default.yaml config.yaml
    echo "IMPORTANT: Please edit config.yaml with your actual FQDN and configuration values"
    echo "The default config contains placeholder values that need to be updated."
fi

# Start services
echo "Starting services with PM2..."
pm2 start etc/certm3.pm2.config.js

echo "Services started. Use 'pm2 list' to check status."
echo "Logs are available in var/spool/certM3/logs/"
echo ""
echo "Next steps:"
echo "1. Set up database: sudo -u postgres ./setup-database.sh"
echo "2. Configure nginx using etc/nginx.certm3-skeleton.conf"
echo "3. Customize config in config.yaml (if not already done)"
echo "4. Access the web interface at your configured domain"
EOF

chmod +x pkg/start.sh

# Create package info
echo "Creating package info..."
cat > pkg/PACKAGE_INFO << EOF
CertM3 Package
Version: $(date +%Y%m%d)
Built: $(date)
Source: $(pwd)
EOF

echo "Package created successfully in pkg/"
echo "To deploy:"
echo "1. Copy pkg/ to your target system"
echo "2. Run ./start.sh from within the pkg directory"
echo "3. Edit config.yaml with your actual domain and settings" 
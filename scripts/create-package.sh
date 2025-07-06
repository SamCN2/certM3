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

# Copy API files (using start.sh approach instead of standalone executable)
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

# Create API start script
echo "Creating API start script..."
cat > start.sh << 'EOF'
#!/bin/bash

# Start script for CertM3 API
set -e

echo "Starting CertM3 API..."

# Build the API if needed
if [ ! -d "dist" ] || [ ! -f "dist/index.js" ]; then
    echo "Building API..."
    npm run build
fi

# Start the API
echo "Starting API server..."
exec node .
EOF

chmod +x start.sh
cd ../..

# Copy static files
echo "Copying static files..."
cp -r static/* pkg/static/

# Copy configuration files
echo "Copying configuration files..."
cp config/config.default.yaml pkg/etc/
cp pkg/etc/config.local.yaml pkg/etc/ 2>/dev/null || echo "Note: config.local.yaml not found, will need to be created manually"
cp README.md pkg/

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
module.exports = {
  apps: [
    // API packaged as directory with Node.js
    {
      name: 'certm3-api',
      script: 'api/start.sh',
      cwd: '.',
      watch: false,
      error_file: 'var/spool/certM3/logs/api-error.log',
      out_file: 'var/spool/certM3/logs/api-out.log',
      log_file: 'var/spool/certM3/logs/api-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '1G',
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
      env: { PORT: 3000 }
    },
    // Middleware app
    {
      name: 'certm3-app',
      script: 'bin/certm3-app',
      args: '--config etc/config.local.yaml',
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
    // Signer
    {
      name: 'certm3-signer',
      script: 'bin/certm3-signer',
      args: '--config etc/config.local.yaml',
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

# Copy CA management scripts (NOT private keys or certificates!)
echo "Copying CA management scripts..."
if [ -d "CA-mgmt" ]; then
    cp -r CA-mgmt pkg/
    echo "CA management scripts copied to pkg/CA-mgmt/"
    echo "Users should generate their own CA certificates using these scripts"
else
    echo "Warning: CA-mgmt directory not found. Users will need to create CA certificates manually."
fi

# Create start script
echo "Creating start script..."
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

# Check if config.local.yaml exists, if not create from default
if [ ! -f "etc/config.local.yaml" ]; then
    echo "Creating config.local.yaml from default..."
    cp etc/config.default.yaml etc/config.local.yaml
    echo "IMPORTANT: Please edit etc/config.local.yaml with your actual FQDN and configuration values"
    echo "The default config contains placeholder values that need to be updated."
fi

# Start services
echo "Starting services with PM2..."
pm2 start etc/certm3.pm2.config.js

echo "Services started. Use 'pm2 list' to check status."
echo "Logs are available in var/spool/certM3/logs/"
echo ""
echo "Next steps:"
echo "1. Configure nginx using etc/nginx.certm3-skeleton.conf"
echo "2. Customize config in etc/config.local.yaml (if not already done)"
echo "3. Access the web interface at your configured domain"
EOF

chmod +x pkg/start.sh

# Create package info
echo "Creating package info..."
cat > pkg/PACKAGE_INFO << EOF
CertM3 Package
Version: $(git describe --tags --always 2>/dev/null || echo "unknown")
Built: $(date)
Platform: Linux x64
Components:
- certm3-app: $(file pkg/bin/certm3-app | cut -d',' -f1)
- certm3-signer: $(file pkg/bin/certm3-signer | cut -d',' -f1)
- certm3-api: Node.js application (api/start.sh)
EOF

# Set permissions
echo "Setting permissions..."
chmod +x pkg/bin/*
chmod +x pkg/api/start.sh
chmod 644 pkg/etc/*

# Create tarball
echo "Creating distribution tarball..."
tar -czf certm3-package-$(date +%Y%m%d).tar.gz pkg/

echo ""
echo "Package created successfully!"
echo "Distribution file: certm3-package-$(date +%Y%m%d).tar.gz"
echo ""
echo "Package contents:"
ls -la pkg/
echo ""
echo "To deploy:"
echo "1. Extract the tarball on target system"
echo "2. Run ./pkg/start.sh"
echo "3. Configure nginx using pkg/etc/nginx.certm3-skeleton.conf"
echo "4. Edit pkg/etc/config.local.yaml with your actual FQDN values" 
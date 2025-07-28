#!/bin/bash

# CertM3 Package Builder - Streamlined Version
# Builds runtime-necessary files only, no development dependencies

set -e

echo "Building CertM3 package..."

# Clean and recreate package directory
rm -rf pkg
mkdir -p pkg/{bin,etc,static,scripts,var/spool/certM3/logs,api}

# Build Go binaries
echo "Building Go binaries..."
cd src/mw
make build
cp bin/certm3-app ../../pkg/bin/
cp bin/certm3-signer ../../pkg/bin/
cd ../..

# Build API (compile TypeScript, don't copy node_modules)
echo "Building API..."
cd src/api
if npm install --legacy-peer-deps; then
    if npm run build; then
        echo "API built successfully"
        # Copy only runtime-necessary files
        cp -r dist ../../pkg/api/
        cp package.json ../../pkg/api/
        # Copy production dependencies
        cp -r node_modules ../../pkg/api/
        echo "API runtime files copied"
    else
        echo "API build failed"
        exit 1
    fi
else
    echo "API dependencies failed to install"
    exit 1
fi
cd ../..

# Copy static files
echo "Copying static files..."
if [ -d "static" ]; then
    cp -r static/* pkg/static/
fi

# Copy scripts
echo "Copying scripts"
cp scripts/*  pkg/scripts/
chmod +x pkg/scripts/*

# Copy and sanitize configuration files
echo "Copying and sanitizing configuration files..."
cp config/config.default.yaml pkg/etc/config.default.yaml

# Sanitize config.yaml - replace local username with production user
sed -i 's/user: "samcn2"/user: "certm3"/g' pkg/etc/config.default.yaml

# Copy CA management scripts
echo "Copying CA management scripts..."
cp -r CA-mgmt pkg/

# Copy database setup scripts
echo "Copying database setup scripts..."
cp scripts/create_certm3_schema.sql pkg/

# Sanitize SQL schema - replace local username with production user
sed -i 's/OWNER TO samcn2/OWNER TO certm3/g' pkg/create_certm3_schema.sql
sed -i 's/Owner: samcn2/Owner: certm3/g' pkg/create_certm3_schema.sql

cp scripts/setup-database.sh pkg/

# Copy nginx configuration files
echo "Copying nginx configuration files..."
mkdir -p pkg/nginx
for ngfile in $( cd nginx ; ls )
do
  cp  nginx/${ngfile} pkg/nginx/${ngfile}.default
  # Sanitize nginx configs - replace absolute paths with placeholders
  sed -i 's|/home/samcn2/src/certM3|{{PROJECT_ROOT}}|g' pkg/nginx/${ngfile}.default
done

# Copy PM2 configuration
echo "Copying PM2 configuration..."
cp scripts/certm3.pm2.config.js pkg/etc/certm3.pm2.config.js.default

# Create setup script
echo "Creating setup script..."
cat > pkg/setup.sh << 'EOF'
#!/bin/bash

# CertM3 Setup Script
set -e

echo "CertM3 Setup"
echo "============"

# Check dependencies
echo "Checking dependencies..."
MISSING_DEPS=()

if ! command -v node &> /dev/null; then
    MISSING_DEPS+=("Node.js >= 18")
fi

if ! command -v npm &> /dev/null; then
    MISSING_DEPS+=("npm >= 10")
fi

if ! command -v pm2 &> /dev/null; then
    MISSING_DEPS+=("PM2 >= 6")
fi

if ! command -v psql &> /dev/null; then
    MISSING_DEPS+=("PostgreSQL >= 14")
fi

if [ ${#MISSING_DEPS[@]} -ne 0 ]; then
    echo "Missing dependencies:"
    for dep in "${MISSING_DEPS[@]}"; do
        echo "  - $dep"
    done
    echo ""
    echo "Please install missing dependencies before continuing."
    echo "Example installation commands:"
    echo "  # Ubuntu/Debian:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
    echo "  sudo apt-get install -y nodejs postgresql postgresql-contrib"
    echo "  sudo npm install -g pm2"
    echo ""
    echo "  # CentOS/RHEL:"
    echo "  sudo yum install -y nodejs postgresql postgresql-server"
    echo "  sudo npm install -g pm2"
    exit 1
fi

echo "All dependencies found ✓"

# Create log directories
echo "Creating log directories..."
mkdir -p var/spool/certM3/logs

# Install API dependencies
echo "Installing API dependencies..."
cd api
npm install --omit=dev --legacy-peer-deps
cd ..

echo ""
echo "Setup complete! ✓"
echo ""
echo "Next steps:"
echo "1. Edit config.yaml with your domain and settings"
echo "2. Set up database: sudo -u postgres ./setup-database.sh"
echo "3. Start services: pm2 start etc/certm3.pm2.config.js"
echo "4. Configure nginx (see etc/nginx.certm3-skeleton.conf)"
EOF

chmod +x pkg/setup.sh

# Create sanitized nginx path configuration script
echo "Creating nginx path configuration script..."
cat > pkg/scripts/configure-nginx-paths.sh << 'EOF'
#!/bin/bash
# Copyright 2025 ogt11.com, llc
# Configure nginx paths for CertM3 deployment

set -e

# Default paths - these will be replaced with actual paths
DEFAULT_PROJECT_ROOT="{{PROJECT_ROOT}}"
DEFAULT_CA_CERT_PATH="{{PROJECT_ROOT}}/CA/certs/ca-cert.pem"

echo "CertM3 Nginx Path Configuration"
echo "==============================="

# Get current directory as project root
PROJECT_ROOT=$(pwd)
echo "Project root: $PROJECT_ROOT"

# Determine CA certificate path
if [ -f "CA/certs/ca-cert.pem" ]; then
    CA_CERT_PATH="$PROJECT_ROOT/CA/certs/ca-cert.pem"
elif [ -f "../CA/certs/ca-cert.pem" ]; then
    CA_CERT_PATH="$(cd .. && pwd)/CA/certs/ca-cert.pem"
else
    echo "Warning: CA certificate not found in expected locations"
    echo "You may need to manually configure the ssl_client_certificate path"
    CA_CERT_PATH="$PROJECT_ROOT/CA/certs/ca-cert.pem"
fi

echo "CA certificate path: $CA_CERT_PATH"

# Configure nginx config files
echo ""
echo "Configuring nginx configuration files..."

for config_file in nginx/*.default; do
    if [ -f "$config_file" ]; then
        output_file="${config_file%.default}"
        echo "Processing: $config_file -> $output_file"
        
        # Replace placeholders with actual paths
        sed -e "s|{{PROJECT_ROOT}}|$PROJECT_ROOT|g" \
            -e "s|\"{{PROJECT_ROOT}}/CA/certs/ca-cert.pem\"|\"$CA_CERT_PATH\"|g" \
            "$config_file" > "$output_file"
        
        echo "  ✓ Created: $output_file"
    fi
done

echo ""
echo "Nginx configuration complete!"
echo ""
echo "Next steps:"
echo "1. Copy the generated nginx configs to your nginx sites-available/"
echo "2. Include the nginx maps file in your main nginx.conf http block"
echo "3. Reload nginx: sudo systemctl reload nginx"
EOF

chmod +x pkg/scripts/configure-nginx-paths.sh

# Create package info with dependency requirements
echo "Creating package info..."
cat > pkg/REQUIREMENTS << 'EOF'
CertM3 Runtime Requirements
==========================

System Dependencies:
- Node.js >= 18
- npm >= 10  
- PM2 >= 6
- PostgreSQL >= 14

Package Contents:
- API: Compiled TypeScript (dist/), package.json for dependencies
- Middleware: Compiled Go binaries (certm3-app, certm3-signer)
- Configuration: PM2 config, nginx skeleton, database schema
- Scripts: Setup, database initialization, CA management

Installation:
1. Extract package to desired location
2. Run ./setup.sh to check dependencies and install API deps
3. Edit config.yaml with your domain and settings
4. Set up database: sudo -u postgres ./setup-database.sh
5. Start services: pm2 start etc/certm3.pm2.config.js

Note: This package contains only runtime-necessary files.
Development dependencies and source code are not included.
EOF

# Set permissions
echo "Setting permissions..."
chmod +x pkg/bin/*

echo ""
echo "Package build complete! ✓"
echo "Package location: pkg/"
echo ""
echo "Package size: $(du -sh pkg/ | cut -f1)"
echo ""
echo "To deploy:"
echo "1. Copy pkg/ to your target system"
echo "2. Run ./setup.sh from within the pkg directory"
echo "3. Follow the setup instructions" 

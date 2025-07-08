#!/bin/bash

# CertM3 Package Builder - Streamlined Version
# Builds runtime-necessary files only, no development dependencies

set -e

echo "Building CertM3 package..."

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

# Build API (compile TypeScript, don't copy node_modules)
echo "Building API..."
cd src/api
if npm install --legacy-peer-deps; then
    if npm run build; then
        echo "API built successfully"
        # Copy only runtime-necessary files
        cp -r dist ../../pkg/api/
        cp package.json ../../pkg/api/
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

# Copy configuration files
echo "Copying configuration files..."
cp config/config.default.yaml pkg/etc/config.yaml
cp config/config.default.yaml pkg/etc/config.default.yaml
cp README.md pkg/

# Copy CA management scripts
echo "Copying CA management scripts..."
cp -r CA-mgmt pkg/

# Copy database setup scripts
echo "Copying database setup scripts..."
cp scripts/create_certm3_schema.sql pkg/
cp scripts/setup-database.sh pkg/

# Copy PM2 config for package
echo "Copying PM2 config..."
cp scripts/certm3.pm2.config.js pkg/etc/

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
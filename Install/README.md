# CertM3 Installation Guide

This guide provides step-by-step instructions for installing and configuring CertM3 on a fresh system.

## Quick Start

For a fully automated installation on a fresh system, run:

```bash
./scripts/fresh-install.sh
```

This script will install all dependencies and build all components automatically.

## Manual Installation

### Prerequisites

- **Operating System**: Linux (Ubuntu 20.04+, CentOS 8+, or similar)
- **Go**: Version 1.21 or later
- **Node.js**: Version 18 or later
- **PostgreSQL**: Version 14 or later
- **OpenSSL**: Latest version
- **Git**: For cloning the repository

### 1. System Dependencies

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y git curl wget build-essential openssl postgresql postgresql-contrib
```

**CentOS/RHEL:**
```bash
sudo dnf install -y git curl wget gcc openssl postgresql-server postgresql-contrib
sudo postgresql-setup --initdb
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### 2. Install Go

```bash
# Download and install Go 1.21
wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
rm go1.21.0.linux-amd64.tar.gz

# Add to PATH
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
export PATH=$PATH:/usr/local/go/bin
```

### 3. Install Node.js

```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 4. Database Setup

Follow the detailed database setup guide: [database-setup.md](database-setup.md)

### 5. Build Components

#### Middleware (Go)
```bash
cd src/mw
go mod tidy
go build -o bin/certm3-app cmd/certm3-app/main.go
go build -o bin/certm3-signer cmd/certm3-signer/main.go
cd ../..
```

#### API (Node.js)
```bash
cd src/api
npm install
cd ../..
```

#### Web Frontend (if applicable)
```bash
cd src/web
npm install
cd ../..
```

### 6. CA Management Setup

Make CA management scripts executable:
```bash
chmod +x CA-mgmt/root/*.sh
chmod +x CA-mgmt/intermediate/*.sh
chmod +x CA-mgmt/monitoring/*.sh
chmod +x CA-mgmt/templates/*.sh
```

### 7. Configuration

#### Middleware Configuration
```bash
# Copy example config
cp src/mw/config.yaml.example src/mw/config.yaml

# Edit configuration
nano src/mw/config.yaml
```

#### API Configuration
```bash
# Set environment variables
export NODE_ENV=production
export API_URL=http://localhost:3000
export CA_CERT_PATH=/path/to/ca.crt
export CA_KEY_PATH=/path/to/ca.key
```

### 8. Service Setup

#### Using systemd (Recommended)
```bash
# Copy service files
sudo cp src/mw/systemd/certm3-app.service /etc/systemd/system/

# Enable and start services
sudo systemctl daemon-reload
sudo systemctl enable certm3-app
sudo systemctl start certm3-app
```

#### Using PM2 (Alternative)
```bash
# Install PM2
npm install -g pm2

# Start services
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

### 9. Verification

Run the build verification script:
```bash
./scripts/verify-build.sh
```

This will check all components and verify the installation.

## Post-Installation

### 1. Create Root CA

Choose your CA management approach:

**OpenSSL-based CA:**
```bash
cd CA-mgmt/root
./create-root-ca.sh
```

**Yubikey-based CA:**
```bash
cd CA-mgmt/root
./yubikey-create-root-ca.sh
```

### 2. Set Up Monitoring

Configure certificate expiration monitoring:
```bash
cd CA-mgmt/monitoring
./check-expiration.sh
```

### 3. Security Hardening

- Review and update firewall rules
- Configure SSL/TLS properly
- Set up log monitoring
- Implement backup procedures

## Troubleshooting

### Common Issues

1. **Go not found**: Ensure Go is in your PATH
2. **Node.js version too old**: Update to Node.js 18+
3. **PostgreSQL connection failed**: Check database setup guide
4. **Permission denied**: Ensure scripts are executable

### Logs

- **Middleware logs**: `/var/log/certm3/mw/`
- **API logs**: Check PM2 logs or systemd journal
- **Database logs**: PostgreSQL logs in `/var/log/postgresql/`

### Support

For additional help:
- Check the [production checklist](../docs/production-checklist.md)
- Review [API documentation](../docs/api-documentation.md)
- Examine [CA management documentation](../CA-mgmt/README.md)

## Next Steps

After installation:
1. Configure your specific environment
2. Set up monitoring and alerting
3. Implement backup procedures
4. Test all certificate workflows
5. Document your deployment

---

For development setup, see the [development guide](../docs/README-certM3-api.md). 
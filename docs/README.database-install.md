# CertM3 Database Installation Guide

This guide provides comprehensive instructions for setting up the PostgreSQL database for the CertM3 certificate management system, including production-ready configurations with mTLS support.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [PostgreSQL Installation](#postgresql-installation)
3. [Database Setup](#database-setup)
4. [User Management](#user-management)
5. [mTLS Configuration](#mtls-configuration)
6. [Loopback 4 API Configuration](#loopback-4-api-configuration)
7. [Security Considerations](#security-considerations)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

- Ubuntu 20.04+ or CentOS 8+ (or equivalent)
- Root or sudo access
- OpenSSL for certificate generation
- Basic knowledge of PostgreSQL administration

## PostgreSQL Installation

### Ubuntu/Debian
```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start and enable PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### CentOS/RHEL
```bash
# Install PostgreSQL
sudo dnf install postgresql postgresql-server postgresql-contrib

# Initialize database
sudo postgresql-setup --initdb

# Start and enable PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

## Database Setup

### 1. Create Production Database User

**⚠️ Security Note: Never use default PostgreSQL users in production**

```bash
# Switch to postgres user
sudo -u postgres psql

# Create production user (replace 'certm3' with your desired username)
CREATE USER certm3 WITH PASSWORD 'your_secure_password_here';

# Create database
CREATE DATABASE certm3_db OWNER certm3;

# Grant necessary privileges
GRANT ALL PRIVILEGES ON DATABASE certm3_db TO certm3;
GRANT CONNECT ON DATABASE certm3_db TO certm3;

# Exit psql
\q
```

### 2. Database Schema Setup

Create the database schema file `scripts/create_certm3_schema.sql`:

```sql
-- CertM3 Database Schema
-- Run as: psql -U certm3 -d certm3_db -f scripts/create_certm3_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'revoked'))
);

-- Certificate requests table
CREATE TABLE certificate_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_id VARCHAR(100) UNIQUE NOT NULL,
    csr_data TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    groups TEXT[], -- Array of group names
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours')
);

-- Certificates table
CREATE TABLE certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_id UUID REFERENCES certificate_requests(id),
    certificate_data TEXT NOT NULL,
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    subject_dn TEXT NOT NULL,
    issuer_dn TEXT NOT NULL,
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revocation_reason VARCHAR(255)
);

-- Groups table
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User groups junction table
CREATE TABLE user_groups (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID REFERENCES users(id),
    PRIMARY KEY (user_id, group_id)
);

-- Audit log table
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_certificate_requests_user_id ON certificate_requests(user_id);
CREATE INDEX idx_certificate_requests_request_id ON certificate_requests(request_id);
CREATE INDEX idx_certificates_user_id ON certificates(user_id);
CREATE INDEX idx_certificates_serial_number ON certificates(serial_number);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- Insert default groups
INSERT INTO groups (name, description) VALUES
    ('admin', 'Administrative access'),
    ('user', 'Standard user access'),
    ('developer', 'Developer access'),
    ('security', 'Security team access');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_certificate_requests_updated_at BEFORE UPDATE ON certificate_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3. Apply Schema

```bash
# Apply the schema
psql -U certm3 -d certm3_db -f scripts/create_certm3_schema.sql
```

## User Management

### Production User Setup

Replace the development user `samcn2` with a production user `certm3`:

```bash
# Create production user
sudo useradd -m -s /bin/bash certm3

# Set password
sudo passwd certm3

# Add to necessary groups
sudo usermod -a -G postgres certm3

# Create application directory
sudo mkdir -p /opt/certm3
sudo chown certm3:certm3 /opt/certm3
```

### Environment Configuration

Create `/opt/certm3/.env`:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=certm3_db
DB_USER=certm3
DB_PASSWORD=your_secure_password_here

# Application Configuration
NODE_ENV=production
PORT=3000
API_BASE_URL=https://your-domain.com/app

# Security Configuration
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here

# mTLS Configuration (if using)
MTLS_ENABLED=true
MTLS_CLIENT_CERT_PATH=/opt/certm3/certs/client.crt
MTLS_CLIENT_KEY_PATH=/opt/certm3/certs/client.key
MTLS_CA_CERT_PATH=/opt/certm3/certs/ca.crt
```

## mTLS Configuration

### 1. Certificate Authority Setup

```bash
# Create certificates directory
sudo mkdir -p /opt/certm3/certs
sudo chown certm3:certm3 /opt/certm3/certs
sudo chmod 700 /opt/certm3/certs

# Generate CA private key
openssl genrsa -out /opt/certm3/certs/ca.key 4096

# Generate CA certificate
openssl req -new -x509 -days 3650 -key /opt/certm3/certs/ca.key \
    -out /opt/certm3/certs/ca.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/OU=IT/CN=CertM3-CA"

# Set proper permissions
sudo chmod 600 /opt/certm3/certs/ca.key
sudo chmod 644 /opt/certm3/certs/ca.crt
```

### 2. Client Certificate Generation

```bash
# Generate client private key
openssl genrsa -out /opt/certm3/certs/client.key 2048

# Generate client certificate signing request
openssl req -new -key /opt/certm3/certs/client.key \
    -out /opt/certm3/certs/client.csr \
    -subj "/C=US/ST=State/L=City/O=Organization/OU=IT/CN=certm3-api"

# Sign client certificate with CA
openssl x509 -req -days 365 -in /opt/certm3/certs/client.csr \
    -CA /opt/certm3/certs/ca.crt -CAkey /opt/certm3/certs/ca.key \
    -CAcreateserial -out /opt/certm3/certs/client.crt

# Set proper permissions
sudo chmod 600 /opt/certm3/certs/client.key
sudo chmod 644 /opt/certm3/certs/client.crt
```

### 3. PostgreSQL mTLS Configuration

Edit `/etc/postgresql/*/main/postgresql.conf`:

```conf
# SSL Configuration
ssl = on
ssl_cert_file = '/etc/ssl/certs/ssl-cert-snakeoil.pem'
ssl_key_file = '/etc/ssl/private/ssl-cert-snakeoil.key'
ssl_ca_file = '/opt/certm3/certs/ca.crt'

# Client certificate verification
ssl_cert_file = '/opt/certm3/certs/server.crt'
ssl_key_file = '/opt/certm3/certs/server.key'
ssl_ca_file = '/opt/certm3/certs/ca.crt'
ssl_crl_file = '/opt/certm3/certs/crl.pem'

# Require client certificates
ssl_verify_client = on
```

Edit `/etc/postgresql/*/main/pg_hba.conf`:

```conf
# mTLS connection for certm3 user
hostssl    certm3_db    certm3    127.0.0.1/32    cert clientcert=1
hostssl    certm3_db    certm3    ::1/128         cert clientcert=1

# Local connections (for administration)
local      all         postgres                    peer
```

### 4. Generate Server Certificate

```bash
# Generate server private key
openssl genrsa -out /opt/certm3/certs/server.key 2048

# Generate server certificate signing request
openssl req -new -key /opt/certm3/certs/server.key \
    -out /opt/certm3/certs/server.csr \
    -subj "/C=US/ST=State/L=City/O=Organization/OU=IT/CN=localhost"

# Sign server certificate with CA
openssl x509 -req -days 365 -in /opt/certm3/certs/server.csr \
    -CA /opt/certm3/certs/ca.crt -CAkey /opt/certm3/certs/ca.key \
    -CAcreateserial -out /opt/certm3/certs/server.crt

# Set proper permissions
sudo chmod 600 /opt/certm3/certs/server.key
sudo chmod 644 /opt/certm3/certs/server.crt
```

## Loopback 4 API Configuration

### 1. Datasource Configuration

Create `src/datasources/postgres.datasource.ts`:

```typescript
import {inject, lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import {juggler} from '@loopback/repository';

const config = {
  name: 'postgres',
  connector: 'postgresql',
  url: process.env.DATABASE_URL || '',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'certm3',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'certm3_db',
  ssl: process.env.MTLS_ENABLED === 'true' ? {
    rejectUnauthorized: false,
    ca: process.env.MTLS_CA_CERT_PATH,
    cert: process.env.MTLS_CLIENT_CERT_PATH,
    key: process.env.MTLS_CLIENT_KEY_PATH,
  } : false,
  schema: 'public',
  pool: {
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 30000,
  },
  acquireConnectionTimeout: 60000,
  connectionTimeout: 60000,
  timeout: 60000,
  query_timeout: 60000,
  statement_timeout: 60000,
  idle_in_transaction_session_timeout: 60000,
};

@lifeCycleObserver('datasource')
export class PostgresDataSource extends juggler.DataSource
  implements LifeCycleObserver {
  static dataSourceName = 'postgres';
  static readonly defaultConfig = config;

  constructor(
    @inject('datasources.config.postgres', {optional: true})
    dsConfig: object = config,
  ) {
    super(dsConfig);
  }
}
```

### 2. Environment Variables

Update your `.env` file with mTLS configuration:

```bash
# mTLS Configuration
MTLS_ENABLED=true
MTLS_CLIENT_CERT_PATH=/opt/certm3/certs/client.crt
MTLS_CLIENT_KEY_PATH=/opt/certm3/certs/client.key
MTLS_CA_CERT_PATH=/opt/certm3/certs/ca.crt

# Database URL with mTLS
DATABASE_URL=postgresql://certm3:your_password@localhost:5432/certm3_db?sslmode=verify-full&sslcert=/opt/certm3/certs/client.crt&sslkey=/opt/certm3/certs/client.key&sslrootcert=/opt/certm3/certs/ca.crt
```

## Security Considerations

### 1. Password Security

- Use strong, randomly generated passwords
- Store passwords in environment variables, not in code
- Consider using a secrets management solution (HashiCorp Vault, AWS Secrets Manager)
- Rotate passwords regularly

### 2. Certificate Security

- Store certificates securely with appropriate permissions
- Use strong key sizes (2048+ bits for RSA)
- Implement certificate revocation lists (CRL)
- Monitor certificate expiration dates
- Use separate CAs for different environments

### 3. Network Security

- Restrict database access to specific IP addresses
- Use firewalls to limit access
- Consider using VPN for remote access
- Monitor database connections and queries

### 4. Database Security

```sql
-- Create read-only user for monitoring
CREATE USER certm3_monitor WITH PASSWORD 'monitor_password';
GRANT CONNECT ON DATABASE certm3_db TO certm3_monitor;
GRANT USAGE ON SCHEMA public TO certm3_monitor;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO certm3_monitor;

-- Enable row-level security (PostgreSQL 9.5+)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY users_select_policy ON users FOR SELECT USING (true);
CREATE POLICY certificates_select_policy ON certificates FOR SELECT USING (true);
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql
   
   # Check logs
   sudo tail -f /var/log/postgresql/postgresql-*.log
   ```

2. **SSL Certificate Issues**
   ```bash
   # Verify certificate chain
   openssl verify -CAfile /opt/certm3/certs/ca.crt /opt/certm3/certs/client.crt
   
   # Test connection with SSL
   psql "postgresql://certm3:password@localhost:5432/certm3_db?sslmode=verify-full&sslcert=/opt/certm3/certs/client.crt&sslkey=/opt/certm3/certs/client.key&sslrootcert=/opt/certm3/certs/ca.crt"
   ```

3. **Permission Issues**
   ```bash
   # Check file permissions
   ls -la /opt/certm3/certs/
   
   # Fix permissions if needed
   sudo chown certm3:certm3 /opt/certm3/certs/*
   sudo chmod 600 /opt/certm3/certs/*.key
   sudo chmod 644 /opt/certm3/certs/*.crt
   ```

### Monitoring Commands

```bash
# Check active connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity WHERE datname = 'certm3_db';"

# Check database size
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('certm3_db'));"

# Check table sizes
sudo -u postgres psql -d certm3_db -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

## Backup and Recovery

### Automated Backups

Create `/opt/certm3/scripts/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/opt/certm3/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="certm3_db"
DB_USER="certm3"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
pg_dump -U $DB_USER -h localhost -d $DB_NAME \
    --format=custom --verbose \
    --file=$BACKUP_DIR/certm3_$DATE.backup

# Compress backup
gzip $BACKUP_DIR/certm3_$DATE.backup

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.backup.gz" -mtime +7 -delete

echo "Backup completed: certm3_$DATE.backup.gz"
```

Make it executable and add to crontab:

```bash
chmod +x /opt/certm3/scripts/backup.sh
crontab -e

# Add this line for daily backups at 2 AM
0 2 * * * /opt/certm3/scripts/backup.sh
```

This comprehensive guide provides everything needed to set up a production-ready PostgreSQL database for the CertM3 certificate management system with proper security, mTLS support, and operational considerations. 
#!/bin/bash
set -e

echo "Setting up CertM3 database..."

# Create certm3 user and database
sudo -u postgres psql << EOF
-- Create user if not exists
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'certm3') THEN
        CREATE USER certm3 WITH PASSWORD 'certm3_password';
    END IF;
END
\$\$;

-- Create database if not exists
SELECT 'CREATE DATABASE certm3 OWNER certm3'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'certm3')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE certm3 TO certm3;
EOF

# Run database migrations
echo "Running database migrations..."
cd /opt/certm3/src/api
npm run migrate

echo "Database setup complete!" 
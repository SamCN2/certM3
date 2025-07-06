#!/bin/bash

# Setup CertM3 database
# This script creates the certm3 database and runs the schema
# Must be run as postgres user

set -e

echo "Setting up CertM3 database..."

# Check if running as postgres user
if [ "$(whoami)" != "postgres" ]; then
    echo "Error: This script must be run as the postgres user"
    echo "Run: sudo -u postgres $0"
    exit 1
fi

# Check if database already exists
if psql -lqt | cut -d \| -f 1 | grep -qw certm3; then
    echo "Database 'certm3' already exists."
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Dropping existing database..."
        dropdb certm3
    else
        echo "Database setup cancelled."
        exit 0
    fi
fi

# Create the database
echo "Creating database 'certm3'..."
createdb certm3

# Run the schema
echo "Running schema..."
psql -d certm3 -f create_certm3_schema.sql

echo "Database setup completed successfully!"
echo "Database 'certm3' is ready for use." 
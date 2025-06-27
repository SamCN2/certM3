#!/bin/bash

# Build script for CertM3 SPA frontend
# This script builds the Single Page Application and copies it to the static directory

set -e

echo "Building CertM3 SPA frontend..."

# Change to the web directory
cd src/web

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build the SPA
echo "Building SPA..."
npm run build

echo "SPA build completed successfully!"
echo "Static files are available in the static/ directory" 
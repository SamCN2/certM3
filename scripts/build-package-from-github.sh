#!/bin/bash

# CertM3 Package Builder from GitHub
# This script builds the CertM3 package by pulling only necessary files from GitHub
# Usage: ./build-package-from-github.sh [tag_or_branch] [output_dir]

set -e

# Configuration
REPO_URL="https://github.com/SamCN2/certM3"
DEFAULT_TAG="v1.9.2"
DEFAULT_OUTPUT_DIR="certm3-package"

# Parse arguments
TAG_OR_BRANCH=${1:-$DEFAULT_TAG}
OUTPUT_DIR=${2:-$DEFAULT_OUTPUT_DIR}

echo "🔧 CertM3 Package Builder from GitHub"
echo "Repository: $REPO_URL"
echo "Version: $TAG_OR_BRANCH"
echo "Output: $OUTPUT_DIR"
echo ""

# Create temporary working directory
TEMP_DIR=$(mktemp -d)
echo "📁 Created temporary directory: $TEMP_DIR"

# Function to download a single file from GitHub
download_file() {
    local file_path="$1"
    local local_path="$2"
    local url="$REPO_URL/raw/$TAG_OR_BRANCH/$file_path"
    
    echo "⬇️  Downloading: $file_path"
    mkdir -p "$(dirname "$local_path")"
    if curl -s -L -f "$url" -o "$local_path"; then
        echo "✅ Downloaded: $file_path"
    else
        echo "❌ Failed to download: $file_path"
        return 1
    fi
}

# Essential files to download
echo "🚀 Starting download process..."

# Configuration files
download_file "config/config.yaml" "$TEMP_DIR/config/config.yaml"
download_file "config/config.default.yaml" "$TEMP_DIR/config/config.default.yaml"

# Nginx configuration
download_file "nginx/certm3.conf" "$TEMP_DIR/nginx/certm3.conf"
download_file "nginx/certm3-maps.conf" "$TEMP_DIR/nginx/certm3-maps.conf"
download_file "nginx/certm3-rate-limits.conf" "$TEMP_DIR/nginx/certm3-rate-limits.conf"

# Build scripts
download_file "scripts/build-package.sh" "$TEMP_DIR/scripts/build-package.sh"
download_file "scripts/generate-nginx-allow.sh" "$TEMP_DIR/scripts/generate-nginx-allow.sh"
download_file "scripts/test-database.sh" "$TEMP_DIR/scripts/test-database.sh"
download_file "scripts/test-models.sh" "$TEMP_DIR/scripts/test-models.sh"
download_file "scripts/test-api-flow.sh" "$TEMP_DIR/scripts/test-api-flow.sh"

# API source files
download_file "src/api/package.json" "$TEMP_DIR/src/api/package.json"
download_file "src/api/package-lock.json" "$TEMP_DIR/src/api/package-lock.json"
download_file "src/api/tsconfig.json" "$TEMP_DIR/src/api/tsconfig.json"
download_file "src/api/src/index.ts" "$TEMP_DIR/src/api/src/index.ts"
download_file "src/api/src/config.ts" "$TEMP_DIR/src/api/src/config.ts"
download_file "src/api/src/logger.ts" "$TEMP_DIR/src/api/src/logger.ts"
download_file "src/api/src/sequence.ts" "$TEMP_DIR/src/api/src/sequence.ts"
download_file "src/api/src/application.ts" "$TEMP_DIR/src/api/src/application.ts"
download_file "src/api/src/controllers/index.ts" "$TEMP_DIR/src/api/src/controllers/index.ts"
download_file "src/api/src/controllers/group.controller.ts" "$TEMP_DIR/src/api/src/controllers/group.controller.ts"
download_file "src/api/src/controllers/user.controller.ts" "$TEMP_DIR/src/api/src/controllers/user.controller.ts"
download_file "src/api/src/controllers/request.controller.ts" "$TEMP_DIR/src/api/src/controllers/request.controller.ts"
download_file "src/api/src/controllers/certificate.controller.ts" "$TEMP_DIR/src/api/src/controllers/certificate.controller.ts"
download_file "src/api/src/controllers/ping.controller.ts" "$TEMP_DIR/src/api/src/controllers/ping.controller.ts"
download_file "src/api/src/models/index.ts" "$TEMP_DIR/src/api/src/models/index.ts"
download_file "src/api/src/models/group.model.ts" "$TEMP_DIR/src/api/src/models/group.model.ts"
download_file "src/api/src/models/user.model.ts" "$TEMP_DIR/src/api/src/models/user.model.ts"
download_file "src/api/src/models/request.model.ts" "$TEMP_DIR/src/api/src/models/request.model.ts"
download_file "src/api/src/models/certificate.model.ts" "$TEMP_DIR/src/api/src/models/certificate.model.ts"
download_file "src/api/src/models/user-group.model.ts" "$TEMP_DIR/src/api/src/models/user-group.model.ts"
download_file "src/api/src/repositories/index.ts" "$TEMP_DIR/src/api/src/repositories/index.ts"
download_file "src/api/src/repositories/group.repository.ts" "$TEMP_DIR/src/api/src/repositories/group.repository.ts"
download_file "src/api/src/repositories/user.repository.ts" "$TEMP_DIR/src/api/src/repositories/user.repository.ts"
download_file "src/api/src/repositories/request.repository.ts" "$TEMP_DIR/src/api/src/repositories/request.repository.ts"
download_file "src/api/src/repositories/certificate.repository.ts" "$TEMP_DIR/src/api/src/repositories/certificate.repository.ts"
download_file "src/api/src/repositories/user-group.repository.ts" "$TEMP_DIR/src/api/src/repositories/user-group.repository.ts"
download_file "src/api/src/datasources/index.ts" "$TEMP_DIR/src/api/src/datasources/index.ts"
download_file "src/api/src/datasources/certm3.datasource.ts" "$TEMP_DIR/src/api/src/datasources/certm3.datasource.ts"
download_file "src/api/src/datasources/postgres.datasource.ts" "$TEMP_DIR/src/api/src/datasources/postgres.datasource.ts"
download_file "src/api/src/datasources/db.datasource.ts" "$TEMP_DIR/src/api/src/datasources/db.datasource.ts"
download_file "src/api/src/datasources/db.datasource.config.json" "$TEMP_DIR/src/api/src/datasources/db.datasource.config.json"
download_file "src/api/src/migrate.ts" "$TEMP_DIR/src/api/src/migrate.ts"
download_file "src/api/src/database/migrate.ts" "$TEMP_DIR/src/api/src/database/migrate.ts"
download_file "src/api/src/database/typeorm.config.ts" "$TEMP_DIR/src/api/src/database/typeorm.config.ts"
download_file "src/api/src/migrations/20240320000000-create-tables.ts" "$TEMP_DIR/src/api/src/migrations/20240320000000-create-tables.ts"
download_file "src/api/src/migrations/20240320000001-add-audit-columns.ts" "$TEMP_DIR/src/api/src/migrations/20240320000001-add-audit-columns.ts"
download_file "src/api/src/migrations/20240320000002-add-display-name.ts" "$TEMP_DIR/src/api/src/migrations/20240320000002-add-display-name.ts"

# Web frontend files
download_file "src/web/package.json" "$TEMP_DIR/src/web/package.json"
download_file "src/web/package-lock.json" "$TEMP_DIR/src/web/package-lock.json"
download_file "src/web/tsconfig.json" "$TEMP_DIR/src/web/tsconfig.json"
download_file "src/web/index.html" "$TEMP_DIR/src/web/index.html"
download_file "src/web/src/index.ts" "$TEMP_DIR/src/web/src/index.ts"
download_file "src/web/src/core/api.ts" "$TEMP_DIR/src/web/src/core/api.ts"
download_file "src/web/src/core/certificate.ts" "$TEMP_DIR/src/web/src/core/certificate.ts"
download_file "src/web/src/core/crypto.ts" "$TEMP_DIR/src/web/src/core/crypto.ts"
download_file "src/web/src/core/error.ts" "$TEMP_DIR/src/web/src/core/error.ts"
download_file "src/web/src/core/security.ts" "$TEMP_DIR/src/web/src/core/security.ts"
download_file "src/web/src/core/state.ts" "$TEMP_DIR/src/web/src/core/state.ts"
download_file "src/web/src/core/types.ts" "$TEMP_DIR/src/web/src/core/types.ts"
download_file "src/web/src/config/web.json" "$TEMP_DIR/src/web/src/config/web.json"
download_file "src/web/vendor/forge.min.js" "$TEMP_DIR/src/web/vendor/forge.min.js"

# Middleware source files
download_file "src/mw/go.mod" "$TEMP_DIR/src/mw/go.mod"
download_file "src/mw/go.sum" "$TEMP_DIR/src/mw/go.sum"
download_file "src/mw/Makefile" "$TEMP_DIR/src/mw/Makefile"
download_file "src/mw/cmd/certm3-app/main.go" "$TEMP_DIR/src/mw/cmd/certm3-app/main.go"
download_file "src/mw/cmd/certm3-signer/main.go" "$TEMP_DIR/src/mw/cmd/certm3-signer/main.go"
download_file "src/mw/internal/app/handlers.go" "$TEMP_DIR/src/mw/internal/app/handlers.go"
download_file "src/mw/internal/app/middleware.go" "$TEMP_DIR/src/mw/internal/app/middleware.go"
download_file "src/mw/internal/app/testapi.go" "$TEMP_DIR/src/mw/internal/app/testapi.go"
download_file "src/mw/internal/signer/handlers.go" "$TEMP_DIR/src/mw/internal/signer/handlers.go"
download_file "src/mw/internal/signer/signer.go" "$TEMP_DIR/src/mw/internal/signer/signer.go"
download_file "src/mw/internal/config/config.go" "$TEMP_DIR/src/mw/internal/config/config.go"
download_file "src/mw/internal/logging/logger.go" "$TEMP_DIR/src/mw/internal/logging/logger.go"
download_file "src/mw/internal/security/security.go" "$TEMP_DIR/src/mw/internal/security/security.go"
download_file "src/mw/internal/api/client.go" "$TEMP_DIR/src/mw/internal/api/client.go"
download_file "src/mw/pkg/metrics/metrics.go" "$TEMP_DIR/src/mw/pkg/metrics/metrics.go"

# CA management scripts
download_file "CA/create-ca.sh" "$TEMP_DIR/CA/create-ca.sh"
download_file "CA/create-ca.js" "$TEMP_DIR/CA/create-ca.js"
download_file "CA/create-cs.js" "$TEMP_DIR/CA/create-cs.js"
download_file "CA/ca.cnf" "$TEMP_DIR/CA/ca.cnf"

# PM2 configuration
download_file "ecosystem.config.js" "$TEMP_DIR/ecosystem.config.js"

# Database setup
download_file "scripts/create_certm3_schema.sql" "$TEMP_DIR/scripts/create_certm3_schema.sql"

echo "✅ All files downloaded successfully!"

# Make scripts executable
chmod +x "$TEMP_DIR/scripts/"*.sh
chmod +x "$TEMP_DIR/CA/"*.sh

# Change to temporary directory and build
echo "🔨 Building package..."
cd "$TEMP_DIR"

# Run the build script
if ./scripts/build-package.sh; then
    echo "✅ Package built successfully!"
    
    # Move package to output directory
    if [ -d "pkg" ]; then
        mv pkg "$OUTPUT_DIR"
        echo "📦 Package moved to: $OUTPUT_DIR"
        echo ""
        echo "🎉 Package build complete!"
        echo "Location: $OUTPUT_DIR"
        echo "Size: $(du -sh "$OUTPUT_DIR" | cut -f1)"
    else
        echo "❌ Build completed but pkg/ directory not found"
        exit 1
    fi
else
    echo "❌ Package build failed"
    exit 1
fi

# Cleanup
echo "🧹 Cleaning up temporary files..."
rm -rf "$TEMP_DIR"

echo "✅ Done!"
# CertM3 GitHub Package Builder

## Overview

The `build-package-from-github.sh` script allows you to build a complete CertM3 package directly from GitHub without needing the full development environment. This is ideal for remote deployments, CI/CD pipelines, or when you need to quickly build a package on any system.

## Features

- ✅ Downloads only necessary source files from GitHub
- ✅ Builds Go binaries (certm3-app, certm3-signer)
- ✅ Builds Node.js API with all dependencies
- ✅ Builds frontend with esbuild
- ✅ Includes all debugging scripts and configuration files
- ✅ Creates a complete, deployable package
- ✅ No local development environment required

## Prerequisites

### System Requirements
- **Linux/Unix system** (tested on Ubuntu 20.04+)
- **Go 1.19+** for building middleware binaries
- **Node.js 18+** for building API and frontend
- **npm** for package management
- **curl** for downloading files
- **bash** shell
- **Internet connection** for downloading from GitHub

### Required Tools
```bash
# Check if required tools are available
go version
node --version
npm --version
curl --version
```

## Quick Start

### 1. Download the Builder Script
```bash
curl -O https://raw.githubusercontent.com/SamCN2/certM3/main/scripts/build-package-from-github.sh
chmod +x build-package-from-github.sh
```

### 2. Build the Package
```bash
# Build from main branch (latest)
./build-package-from-github.sh main

# Build from specific version
./build-package-from-github.sh v1.9.3

# Build with custom output directory
./build-package-from-github.sh main my-custom-package
```

### 3. Deploy the Package
```bash
# Copy to target system
scp -r certm3-package user@remote-server:/path/to/deploy/

# On target system
cd certm3-package
./setup.sh
```

## Usage Examples

### Basic Usage
```bash
# Build latest version
./build-package-from-github.sh main

# Build specific version
./build-package-from-github.sh v1.9.3

# Build with custom output name
./build-package-from-github.sh main my-deployment
```

### Remote Deployment
```bash
# On remote server
curl -O https://raw.githubusercontent.com/SamCN2/certM3/main/scripts/build-package-from-github.sh
chmod +x build-package-from-github.sh
./build-package-from-github.sh main
```

### CI/CD Pipeline
```bash
# In your CI/CD script
curl -O https://raw.githubusercontent.com/SamCN2/certM3/main/scripts/build-package-from-github.sh
chmod +x build-package-from-github.sh
./build-package-from-github.sh $VERSION
# Upload certm3-package/ to artifact storage
```

## What Gets Built

The script downloads and builds:

### Core Components
- **Go Middleware** (`certm3-app`, `certm3-signer`)
- **Node.js API** (LoopBack 4 with PostgreSQL)
- **Frontend** (HTML/JS with certificate management)

### Configuration Files
- Nginx configurations (`certm3.conf`, `certm3-maps.conf`, `certm3-rate-limits.conf`)
- PM2 process manager configuration
- Database setup scripts
- CA management scripts

### Debugging Tools
- `test-database.sh` - Database connectivity tests
- `test-models.sh` - API model validation
- `test-api-flow.sh` - Full API flow testing
- `health-check.sh` - System health monitoring
- `generate-nginx-allow.sh` - Nginx access control

## Output Structure

```
certm3-package/
├── bin/                    # Go binaries
│   ├── certm3-app
│   └── certm3-signer
├── api/                    # Node.js API
│   ├── dist/              # Compiled API
│   ├── node_modules/      # Dependencies
│   └── package.json
├── web/                    # Frontend
│   ├── dist/              # Built frontend
│   └── vendor/            # Third-party libraries
├── scripts/               # Debugging and setup scripts
├── etc/                   # Configuration files
├── CA/                    # Certificate Authority scripts
├── CA-mgmt/              # CA management tools
└── setup.sh              # Installation script
```

## Troubleshooting

### Common Issues

#### 1. Missing Dependencies
```bash
# Error: Cannot find module 'winston'
# Solution: Ensure you're using the latest script version
curl -O https://raw.githubusercontent.com/SamCN2/certM3/main/scripts/build-package-from-github.sh
```

#### 2. Go Build Failures
```bash
# Error: go: command not found
# Solution: Install Go
sudo apt update && sudo apt install golang-go
# Or download from https://golang.org/dl/
```

#### 3. Node.js Version Issues
```bash
# Error: Unsupported engine
# Solution: Use Node.js 18+ (script handles this automatically)
node --version  # Should be 18.x or higher
```

#### 4. Network Issues
```bash
# Error: Failed to download files
# Solution: Check internet connectivity and GitHub access
curl -I https://raw.githubusercontent.com/SamCN2/certM3/main/scripts/build-package-from-github.sh
```

### Debug Mode
```bash
# Run with verbose output
bash -x ./build-package-from-github.sh main
```

## Security Considerations

- The script downloads files from GitHub's raw content URLs
- All downloads are from the official CertM3 repository
- No external dependencies are downloaded during build
- Generated package contains only source code and built artifacts

## Version Compatibility

| CertM3 Version | Node.js | Go | Status |
|----------------|---------|----|--------|
| v1.9.3+ | 18+ | 1.19+ | ✅ Supported |
| v1.9.0-v1.9.2 | 18+ | 1.19+ | ⚠️ Limited |
| < v1.9.0 | 18+ | 1.19+ | ❌ Not Supported |

## Contributing

To add new files to the build process:

1. Add the file to the download list in `build-package-from-github.sh`
2. Test the build locally
3. Commit and push changes
4. Update this README if needed

## License

This script is part of the CertM3 project and follows the same license terms.

## Support

For issues with the GitHub builder:
1. Check the troubleshooting section above
2. Verify you're using the latest script version
3. Check the CertM3 repository for updates
4. Open an issue on the CertM3 GitHub repository

---

**Note**: This builder creates a complete, self-contained package that can be deployed on any compatible system without requiring the full development environment.
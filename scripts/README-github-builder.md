# CertM3 GitHub Package Builder

This script allows you to build the CertM3 package directly from GitHub without needing the full source tree locally.

## Usage

```bash
# Build latest version (v1.9.2)
./scripts/build-package-from-github.sh

# Build specific tag
./scripts/build-package-from-github.sh v1.9.1

# Build from branch
./scripts/build-package-from-github.sh main

# Specify output directory
./scripts/build-package-from-github.sh v1.9.2 my-custom-package
```

## What it does

1. **Downloads only essential files** from GitHub (no full clone needed)
2. **Creates temporary build environment** with minimal footprint
3. **Runs the standard build process** using `scripts/build-package.sh`
4. **Produces identical package** to local builds
5. **Cleans up automatically** after build

## Requirements

- `curl` (for downloading files)
- `bash` (for script execution)
- Standard build tools (Node.js, Go, etc.)

## Benefits

- **No git clone needed** - just download the script and run it
- **Minimal disk usage** - only downloads what's needed
- **Consistent builds** - uses same process as local builds
- **CI/CD friendly** - perfect for automated builds
- **Remote builds** - build on any machine with internet access

## Example Workflow

```bash
# Download the builder script
curl -O https://raw.githubusercontent.com/SamCN2/certM3/main/scripts/build-package-from-github.sh
chmod +x build-package-from-github.sh

# Build the package
./build-package-from-github.sh v1.9.2

# Deploy the package
cd certm3-package
./setup.sh
```

## Files Downloaded

The script downloads only the essential files needed for building:

- Configuration files (`config/`)
- Nginx configuration (`nginx/`)
- Build scripts (`scripts/`)
- API source code (`src/api/`)
- Web frontend (`src/web/`)
- Middleware source (`src/mw/`)
- CA management scripts (`CA/`)
- PM2 configuration (`ecosystem.config.js`)

## Error Handling

- **Missing files**: Script will fail if essential files are missing
- **Network issues**: Uses `curl -f` to detect download failures
- **Build failures**: Propagates build script errors
- **Cleanup**: Always cleans up temporary files

## Security

- Downloads from official GitHub repository
- Uses HTTPS for all downloads
- Validates file downloads with curl error checking
- No execution of downloaded code until verified
#!/bin/bash
# Copyright 2025 ogt11.com, llc
# CertM3 Permission Check Script

set -e

echo "CertM3 Permission Check"
echo "======================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "OK")
            echo -e "${GREEN}✓${NC} $message"
            ;;
        "WARN")
            echo -e "${YELLOW}⚠${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}✗${NC} $message"
            ;;
    esac
}

# Check if we're in the right directory
if [ ! -f "etc/config.yaml" ]; then
    print_status "ERROR" "Configuration file not found. Run this script from the pkg directory."
    exit 1
fi

echo "Checking file and directory permissions..."
echo ""

# Check configuration file permissions
echo "Configuration Files:"
if [ -r "etc/config.yaml" ]; then
    print_status "OK" "etc/config.yaml is readable"
else
    print_status "ERROR" "etc/config.yaml is not readable"
fi

if [ -r "etc/certm3.pm2.config.js" ]; then
    print_status "OK" "etc/certm3.pm2.config.js is readable"
else
    print_status "ERROR" "etc/certm3.pm2.config.js is not readable"
fi

# Check binary file permissions
echo ""
echo "Binary Files:"
if [ -x "bin/certm3-app" ]; then
    print_status "OK" "bin/certm3-app is executable"
else
    print_status "ERROR" "bin/certm3-app is not executable"
fi

if [ -x "bin/certm3-signer" ]; then
    print_status "OK" "bin/certm3-signer is executable"
else
    print_status "ERROR" "bin/certm3-signer is not executable"
fi

# Check directory permissions
echo ""
echo "Directory Permissions:"
if [ -d "var/spool/certM3/logs" ]; then
    if [ -w "var/spool/certM3/logs" ]; then
        print_status "OK" "var/spool/certM3/logs is writable"
    else
        print_status "ERROR" "var/spool/certM3/logs is not writable"
    fi
else
    print_status "ERROR" "var/spool/certM3/logs directory does not exist"
fi

if [ -d "api" ]; then
    if [ -r "api" ] && [ -x "api" ]; then
        print_status "OK" "api directory is accessible"
    else
        print_status "ERROR" "api directory is not accessible"
    fi
else
    print_status "ERROR" "api directory does not exist"
fi

# Check API subdirectory permissions
if [ -d "api/dist" ]; then
    if [ -r "api/dist" ]; then
        print_status "OK" "api/dist directory is readable"
    else
        print_status "ERROR" "api/dist directory is not readable"
    fi
else
    print_status "ERROR" "api/dist directory does not exist"
fi

if [ -d "api/node_modules" ]; then
    if [ -r "api/node_modules" ]; then
        print_status "OK" "api/node_modules directory is readable"
    else
        print_status "ERROR" "api/node_modules directory is not readable"
    fi
else
    print_status "WARN" "api/node_modules directory does not exist (run setup.sh)"
fi

# Check CA directory permissions
echo ""
echo "CA Management:"
if [ -d "CA-mgmt" ]; then
    if [ -r "CA-mgmt" ]; then
        print_status "OK" "CA-mgmt directory is readable"
    else
        print_status "ERROR" "CA-mgmt directory is not readable"
    fi
else
    print_status "WARN" "CA-mgmt directory does not exist"
fi

# Check nginx directory permissions
echo ""
echo "Nginx Configuration:"
if [ -d "nginx" ]; then
    if [ -r "nginx" ]; then
        print_status "OK" "nginx directory is readable"
    else
        print_status "ERROR" "nginx directory is not readable"
    fi
    
    if [ -f "nginx/certm3.conf" ]; then
        if [ -r "nginx/certm3.conf" ]; then
            print_status "OK" "nginx/certm3.conf is readable"
        else
            print_status "ERROR" "nginx/certm3.conf is not readable"
        fi
    else
        print_status "WARN" "nginx/certm3.conf does not exist"
    fi
else
    print_status "WARN" "nginx directory does not exist"
fi

# Check script permissions
echo ""
echo "Script Permissions:"
if [ -x "setup.sh" ]; then
    print_status "OK" "setup.sh is executable"
else
    print_status "ERROR" "setup.sh is not executable"
fi

if [ -x "setup-database.sh" ]; then
    print_status "OK" "setup-database.sh is executable"
else
    print_status "ERROR" "setup-database.sh is not executable"
fi

# Check current user and group
echo ""
echo "Current User Context:"
CURRENT_USER=$(whoami)
CURRENT_GROUP=$(id -gn)
print_status "OK" "Running as user: $CURRENT_USER (group: $CURRENT_GROUP)"

# Check if user can write to log directory
if [ -w "var/spool/certM3/logs" ]; then
    print_status "OK" "User can write to log directory"
else
    print_status "ERROR" "User cannot write to log directory"
    echo "  Try: sudo chown -R $CURRENT_USER:$CURRENT_GROUP var/spool/certM3/logs"
fi

# Check if user can read config files
if [ -r "etc/config.yaml" ]; then
    print_status "OK" "User can read configuration files"
else
    print_status "ERROR" "User cannot read configuration files"
    echo "  Try: sudo chown -R $CURRENT_USER:$CURRENT_GROUP etc/"
fi

# Check if user can execute binaries
if [ -x "bin/certm3-app" ] && [ -x "bin/certm3-signer" ]; then
    print_status "OK" "User can execute binary files"
else
    print_status "ERROR" "User cannot execute binary files"
    echo "  Try: sudo chown -R $CURRENT_USER:$CURRENT_GROUP bin/"
fi

echo ""
print_status "OK" "Permission check completed!"
echo ""
echo "If any errors were found, fix them before starting the services."
echo "Common fixes:"
echo "  sudo chown -R \$USER:\$USER ."
echo "  chmod +x bin/*"
echo "  chmod +x *.sh" 
#!/bin/bash
# fresh-install.sh: Fresh installation of CertM3 on a new machine
# This script sets up all dependencies and builds the system from scratch

set -e

echo "=== CertM3 Fresh Installation ==="
echo "This script installs CertM3 on a fresh machine."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    local status=$1
    local message=$2
    if [ "$status" = "OK" ]; then
        echo -e "${GREEN}✓${NC} $message"
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}⚠${NC} $message"
    elif [ "$status" = "INFO" ]; then
        echo -e "${BLUE}ℹ${NC} $message"
    else
        echo -e "${RED}✗${NC} $message"
        exit 1
    fi
}

# Function to check version and ask for confirmation
check_version_and_confirm() {
    local tool_name=$1
    local min_version=$2
    local version_command=$3
    local install_command=$4
    
    echo ""
    echo "=== Checking $tool_name ==="
    
    if command -v $tool_name >/dev/null 2>&1; then
        local current_version=$($version_command 2>/dev/null || echo "unknown")
        print_status "INFO" "$tool_name is installed"
        echo -e "${BLUE}ℹ${NC} Current version: $current_version"
        echo -e "${BLUE}ℹ${NC} Minimum required: $min_version"
        
        if [[ "$current_version" == "unknown" ]]; then
            print_status "WARN" "Could not determine $tool_name version"
        fi
        
        read -p "Continue with current $tool_name installation? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "INFO" "Please install/update $tool_name manually and run this script again"
            exit 1
        fi
    else
        print_status "WARN" "$tool_name is not installed"
        echo -e "${BLUE}ℹ${NC} Minimum required: $min_version"
        echo -e "${BLUE}ℹ${NC} Install command: $install_command"
        
        read -p "Install $tool_name automatically? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "INFO" "Please install $tool_name manually and run this script again"
            exit 1
        fi
        
        # Execute the install command
        eval "$install_command"
    fi
}

# Function to detect OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [ -f /etc/debian_version ]; then
            echo "debian"
        elif [ -f /etc/redhat-release ]; then
            echo "redhat"
        else
            echo "linux"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    else
        echo "unknown"
    fi
}

OS=$(detect_os)
echo -e "${BLUE}ℹ${NC} Detected OS: $OS"

echo ""
echo "=== 1. Installing System Dependencies ==="

case $OS in
    "debian")
        print_status "INFO" "Installing dependencies on Debian/Ubuntu..."
        sudo apt update
        sudo apt install -y git curl wget build-essential openssl
        ;;
    "redhat")
        print_status "INFO" "Installing dependencies on RedHat/CentOS..."
        sudo dnf install -y git curl wget gcc openssl
        ;;
    "macos")
        print_status "INFO" "Installing dependencies on macOS..."
        if ! command -v brew >/dev/null 2>&1; then
            print_status "WARN" "Homebrew not found. Please install Homebrew first:"
            echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            exit 1
        fi
        brew install git curl wget openssl
        ;;
    *)
        print_status "WARN" "Unknown OS. Please install dependencies manually:"
        echo "  - Git"
        echo "  - Go (1.19+)"
        echo "  - Node.js (18+)"
        echo "  - OpenSSL"
        echo "  - PostgreSQL (14+)"
        ;;
esac

echo ""
echo "=== 2. Checking Go ==="

# Function to install Go based on OS
install_go() {
    GO_VERSION="1.21.0"
    GO_ARCH="linux-amd64"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        GO_ARCH="darwin-amd64"
    fi
    
    wget -q "https://go.dev/dl/go${GO_VERSION}.${GO_ARCH}.tar.gz"
    sudo tar -C /usr/local -xzf "go${GO_VERSION}.${GO_ARCH}.tar.gz"
    rm "go${GO_VERSION}.${GO_ARCH}.tar.gz"
    
    # Add Go to PATH
    echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
    export PATH=$PATH:/usr/local/go/bin
    
    print_status "OK" "Go installed successfully"
}

check_version_and_confirm "go" "1.19" "go version" "install_go"

echo ""
echo "=== 3. Checking Node.js ==="

# Function to install Node.js based on OS
install_nodejs() {
    case $OS in
        "debian")
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
            ;;
        "redhat")
            curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
            sudo yum install -y nodejs
            ;;
        "macos")
            brew install node@18
            ;;
        *)
            print_status "ERROR" "Please install Node.js 18+ manually for your OS"
            exit 1
            ;;
    esac
    print_status "OK" "Node.js installed successfully"
}

check_version_and_confirm "node" "18" "node --version" "install_nodejs"

echo ""
echo "=== 4. Checking PostgreSQL ==="

# Function to install PostgreSQL based on OS
install_postgresql() {
    case $OS in
        "debian")
            sudo apt install -y postgresql postgresql-contrib
            sudo systemctl start postgresql
            sudo systemctl enable postgresql
            ;;
        "redhat")
            sudo dnf install -y postgresql-server postgresql-contrib
            sudo postgresql-setup --initdb
            sudo systemctl start postgresql
            sudo systemctl enable postgresql
            ;;
        "macos")
            brew install postgresql@14
            brew services start postgresql@14
            ;;
        *)
            print_status "ERROR" "Please install PostgreSQL 14+ manually for your OS"
            exit 1
            ;;
    esac
    print_status "OK" "PostgreSQL installed and started"
}

# Check if PostgreSQL is installed and running
if command -v psql >/dev/null 2>&1; then
    print_status "INFO" "PostgreSQL is installed"
    
    # Try to get version
    PG_VERSION=$(psql --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+' | head -1 || echo "unknown")
    echo -e "${BLUE}ℹ${NC} Current version: $PG_VERSION"
    echo -e "${BLUE}ℹ${NC} Minimum required: 14"
    
    # Check if service is running
    if pg_isready >/dev/null 2>&1; then
        print_status "OK" "PostgreSQL service is running"
    else
        print_status "WARN" "PostgreSQL service is not running"
        case $OS in
            "debian"|"redhat")
                sudo systemctl start postgresql
                ;;
            "macos")
                brew services start postgresql
                ;;
        esac
    fi
    
    read -p "Continue with current PostgreSQL installation? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "INFO" "Please install/update PostgreSQL manually and run this script again"
        exit 1
    fi
else
    print_status "WARN" "PostgreSQL is not installed"
    echo -e "${BLUE}ℹ${NC} Minimum required: 14"
    
    read -p "Install PostgreSQL automatically? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "INFO" "Please install PostgreSQL manually and run this script again"
        exit 1
    fi
    
    install_postgresql
fi

echo ""
echo "=== 5. Building CertM3 ==="

# Build middleware
print_status "INFO" "Building middleware..."
cd src/mw
go mod tidy
go build -o bin/certm3-app cmd/certm3-app/main.go
go build -o bin/certm3-signer cmd/certm3-signer/main.go
print_status "OK" "Middleware built successfully"
cd ../..

# Build API (if exists)
if [ -f "src/api/package.json" ]; then
    print_status "INFO" "Building API..."
    cd src/api
    npm install
    print_status "OK" "API built successfully"
    cd ../..
else
    print_status "WARN" "API package.json not found, skipping API build"
fi

# Build web frontend (if exists)
if [ -f "src/web/package.json" ]; then
    print_status "INFO" "Building web frontend..."
    cd src/web
    npm install
    print_status "OK" "Web frontend built successfully"
    cd ../..
else
    print_status "WARN" "Web frontend package.json not found, skipping web build"
fi

echo ""
echo "=== 6. Setting up CA Management ==="

# Make CA management scripts executable
chmod +x CA-mgmt/root/*.sh
chmod +x CA-mgmt/intermediate/*.sh
chmod +x CA-mgmt/monitoring/*.sh
chmod +x CA-mgmt/templates/*.sh

print_status "OK" "CA management scripts made executable"

echo ""
echo "=== 7. Creating Configuration Files ==="

# Copy example configs
if [ -f "src/mw/config.yaml.example" ]; then
    cp src/mw/config.yaml.example src/mw/config.yaml
    print_status "OK" "Middleware config created from example"
else
    print_status "WARN" "Middleware config example not found"
fi

echo ""
echo "=== Installation Complete ==="
echo ""
echo "Next steps:"
echo "1. Configure the database:"
echo "   - See Install/database-setup.md for database setup"
echo "   - Run: psql -U postgres -c \"CREATE DATABASE certm3;\""
echo ""
echo "2. Set up CA management:"
echo "   - See CA-mgmt/README.md for CA setup"
echo "   - Choose between Yubikey or OpenSSL approach"
echo ""
echo "3. Configure middleware:"
echo "   - Edit src/mw/config.yaml"
echo "   - Set database connection and CA paths"
echo ""
echo "4. Start services:"
echo "   - Start middleware: ./src/mw/bin/certm3-app"
echo "   - Start signer: ./src/mw/bin/certm3-signer"
echo ""
echo "5. Run verification:"
echo "   - ./scripts/verify-build.sh"
echo ""
echo "For detailed instructions, see the documentation in each component directory." 
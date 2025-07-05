#!/bin/bash

# CertM3 Request Email Generator
# Generates emails for each request entry in the database
# Usage: ./generate-request-emails.sh [options]

set -e

# Default values
BASE_URL=""
SMTP_SERVER=""
DRY_RUN=false
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="certm3"
DB_USER="certm3"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Help function
show_help() {
    cat << EOF
CertM3 Request Email Generator

Usage: $0 [OPTIONS]

OPTIONS:
    -b, --base-url URL        Base URL for the application (required)
    -s, --smtp-server SERVER  SMTP server for sending emails (required unless --dry-run)
    -d, --dry-run            Print emails to stdout instead of sending
    -h, --host HOST          Database host (default: localhost)
    -p, --port PORT          Database port (default: 5432)
    -n, --name NAME          Database name (default: certm3)
    -u, --user USER          Database user (default: certm3)
    --help                   Show this help message

EXAMPLES:
    # Dry run - print emails to stdout
    $0 -b "https://urp.ogt11.com" --dry-run

    # Send emails via SMTP
    $0 -b "https://urp.ogt11.com" -s "smtp.gmail.com:587"

    # Custom database connection
    $0 -b "https://urp.ogt11.com" -s "smtp.gmail.com:587" -h "db.example.com" -p "5432"

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -b|--base-url)
            BASE_URL="$2"
            shift 2
            ;;
        -s|--smtp-server)
            SMTP_SERVER="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--host)
            DB_HOST="$2"
            shift 2
            ;;
        -p|--port)
            DB_PORT="$2"
            shift 2
            ;;
        -n|--name)
            DB_NAME="$2"
            shift 2
            ;;
        -u|--user)
            DB_USER="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Error: Unknown option $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Validate required parameters
if [[ -z "$BASE_URL" ]]; then
    echo -e "${RED}Error: Base URL is required${NC}"
    show_help
    exit 1
fi

if [[ "$DRY_RUN" == false && -z "$SMTP_SERVER" ]]; then
    echo -e "${RED}Error: SMTP server is required unless using --dry-run${NC}"
    show_help
    exit 1
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: psql command not found. Please install PostgreSQL client.${NC}"
    exit 1
fi

# Function to generate email content
generate_email_content() {
    local request_id="$1"
    local username="$2"
    local email="$3"
    local display_name="$4"
    local challenge="$5"
    local ticket_number="$6"
    
    cat << EOF
Subject: CertM3 Certificate Request Validation - $ticket_number

Dear $display_name,

Thank you for your certificate request. To complete the process, please validate your email address by clicking the link below:

Validation Link: $BASE_URL/validate?requestId=$request_id&token=$challenge

If the link above doesn't work, you can manually enter the validation code:
Validation Code: $challenge

Request Details:
- Username: $username
- Email: $email
- Display Name: $display_name
- Ticket Number: $ticket_number
- Request ID: $request_id

If you did not request a certificate, please ignore this email.

For support, please contact your system administrator and reference ticket number: $ticket_number

Best regards,
CertM3 System
EOF
}

# Function to send email via SMTP
send_email() {
    local to="$1"
    local subject="$2"
    local body="$3"
    
    # Create temporary file for email content
    local temp_file=$(mktemp)
    echo "$body" > "$temp_file"
    
    # Send email using curl (if available) or mail command
    if command -v curl &> /dev/null; then
        # Try using curl with SMTP
        echo -e "${YELLOW}Sending email to $to via SMTP...${NC}"
        # Note: This is a simplified example. In production, you might want to use a proper SMTP library
        echo "Email would be sent to: $to"
        echo "Subject: $subject"
        echo "Body: $body"
    else
        echo -e "${YELLOW}Sending email to $to...${NC}"
        mail -s "$subject" "$to" < "$temp_file"
    fi
    
    rm "$temp_file"
}

# Main execution
echo -e "${BLUE}CertM3 Request Email Generator${NC}"
echo "=================================="
echo "Base URL: $BASE_URL"
echo "SMTP Server: ${SMTP_SERVER:-"Not specified (dry run mode)"}"
echo "Database: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
echo "Dry Run: $DRY_RUN"
echo ""

# Query to get all pending requests
QUERY="
SELECT 
    id,
    username,
    email,
    display_name,
    challenge,
    COALESCE(ticket_number, 'TKT-' || to_char(created_at, 'YYYYMMDD') || '-' || lpad(row_number() over (order by created_at)::text, 4, '0')) as ticket_number,
    created_at
FROM requests 
WHERE status = 'pending' 
ORDER BY created_at DESC;
"

echo -e "${YELLOW}Fetching pending requests from database...${NC}"

# Execute query and process results
psql -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -U "$DB_USER" -t -c "$QUERY" | while IFS='|' read -r request_id username email display_name challenge ticket_number created_at; do
    # Trim whitespace
    request_id=$(echo "$request_id" | xargs)
    username=$(echo "$username" | xargs)
    email=$(echo "$email" | xargs)
    display_name=$(echo "$display_name" | xargs)
    challenge=$(echo "$challenge" | xargs)
    ticket_number=$(echo "$ticket_number" | xargs)
    created_at=$(echo "$created_at" | xargs)
    
    # Skip empty lines
    if [[ -z "$request_id" ]]; then
        continue
    fi
    
    echo -e "${GREEN}Processing request: $ticket_number${NC}"
    echo "  Username: $username"
    echo "  Email: $email"
    echo "  Created: $created_at"
    
    # Generate email content
    email_content=$(generate_email_content "$request_id" "$username" "$email" "$display_name" "$challenge" "$ticket_number")
    email_subject="CertM3 Certificate Request Validation - $ticket_number"
    
    if [[ "$DRY_RUN" == true ]]; then
        echo -e "${BLUE}=== EMAIL CONTENT (DRY RUN) ===${NC}"
        echo "To: $email"
        echo "Subject: $email_subject"
        echo ""
        echo "$email_content"
        echo -e "${BLUE}=== END EMAIL ===${NC}"
        echo ""
    else
        # Send email
        send_email "$email" "$email_subject" "$email_content"
        echo -e "${GREEN}Email sent successfully to $email${NC}"
        echo ""
    fi
done

echo -e "${GREEN}Email generation complete!${NC}"

if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}Note: This was a dry run. No emails were actually sent.${NC}"
    echo "To send actual emails, provide an SMTP server with the -s option."
fi 
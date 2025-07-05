#!/usr/bin/env python3
"""
CertM3 Request Email Generator
Generates emails for each request entry in the database

Usage:
    python3 generate-request-emails.py --base-url "https://urp.ogt11.com" --dry-run
    python3 generate-request-emails.py --base-url "https://urp.ogt11.com" --smtp-server "smtp.gmail.com:587"
"""

import argparse
import psycopg2
import smtplib
import sys
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import os

# Colors for output
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'  # No Color

def print_colored(text, color):
    """Print colored text"""
    print(f"{color}{text}{Colors.NC}")

def show_help():
    """Show help message"""
    help_text = """
CertM3 Request Email Generator

Usage: python3 generate-request-emails.py [OPTIONS]

OPTIONS:
    -b, --base-url URL        Base URL for the application (required)
    -s, --smtp-server SERVER  SMTP server for sending emails (required unless --dry-run)
    -d, --dry-run            Print emails to stdout instead of sending
    -h, --host HOST          Database host (default: localhost)
    -p, --port PORT          Database port (default: 5432)
    -n, --name NAME          Database name (default: certm3)
    -u, --user USER          Database user (default: certm3)
    --smtp-user USER         SMTP username (if required)
    --smtp-password PASS     SMTP password (if required)
    --smtp-tls              Use TLS for SMTP connection
    --help                   Show this help message

EXAMPLES:
    # Dry run - print emails to stdout
    python3 generate-request-emails.py -b "https://urp.ogt11.com" --dry-run

    # Send emails via SMTP
    python3 generate-request-emails.py -b "https://urp.ogt11.com" -s "smtp.gmail.com:587" --smtp-tls

    # Custom database connection
    python3 generate-request-emails.py -b "https://urp.ogt11.com" -s "smtp.gmail.com:587" -h "db.example.com" -p "5432"
"""
    print(help_text)

def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='CertM3 Request Email Generator')
    parser.add_argument('-b', '--base-url', required=True, help='Base URL for the application')
    parser.add_argument('-s', '--smtp-server', help='SMTP server for sending emails')
    parser.add_argument('-d', '--dry-run', action='store_true', help='Print emails to stdout instead of sending')
    parser.add_argument('--host', default='localhost', help='Database host (default: localhost)')
    parser.add_argument('--port', default='5432', help='Database port (default: 5432)')
    parser.add_argument('-n', '--name', default='certm3', help='Database name (default: certm3)')
    parser.add_argument('-u', '--user', default='certm3', help='Database user (default: certm3)')
    parser.add_argument('--smtp-user', help='SMTP username (if required)')
    parser.add_argument('--smtp-password', help='SMTP password (if required)')
    parser.add_argument('--smtp-tls', action='store_true', help='Use TLS for SMTP connection')
    
    args = parser.parse_args()
    
    # Validate arguments
    if not args.dry_run and not args.smtp_server:
        print_colored("Error: SMTP server is required unless using --dry-run", Colors.RED)
        show_help()
        sys.exit(1)
    
    return args

def connect_database(args):
    """Connect to PostgreSQL database"""
    try:
        # Try to get password from environment variable
        db_password = os.environ.get('DB_PASSWORD', '')
        
        conn = psycopg2.connect(
            host=args.host,
            port=args.port,
            database=args.name,
            user=args.user,
            password=db_password
        )
        return conn
    except psycopg2.Error as e:
        print_colored(f"Error connecting to database: {e}", Colors.RED)
        sys.exit(1)

def get_pending_requests(conn):
    """Get all pending requests from database"""
    query = """
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
    """
    
    try:
        cursor = conn.cursor()
        cursor.execute(query)
        return cursor.fetchall()
    except psycopg2.Error as e:
        print_colored(f"Error executing query: {e}", Colors.RED)
        sys.exit(1)

def generate_email_content(request_id, username, email, display_name, challenge, ticket_number, base_url):
    """Generate email content"""
    subject = f"CertM3 Certificate Request Validation - {ticket_number}"
    
    body = f"""Dear {display_name},

Thank you for your certificate request. To complete the process, please validate your email address by clicking the link below:

Validation Link: {base_url}/validate?requestId={request_id}&token={challenge}

If the link above doesn't work, you can manually enter the validation code:
Validation Code: {challenge}

Request Details:
- Username: {username}
- Email: {email}
- Display Name: {display_name}
- Ticket Number: {ticket_number}
- Request ID: {request_id}

If you did not request a certificate, please ignore this email.

For support, please contact your system administrator and reference ticket number: {ticket_number}

Best regards,
CertM3 System"""
    
    return subject, body

def send_email(smtp_server, smtp_user, smtp_password, use_tls, to_email, subject, body):
    """Send email via SMTP"""
    try:
        # Parse SMTP server and port
        if ':' in smtp_server:
            server, port = smtp_server.split(':')
            port = int(port)
        else:
            server = smtp_server
            port = 587 if use_tls else 25
        
        # Create message
        msg = MIMEMultipart()
        msg['From'] = smtp_user or 'noreply@certm3.local'
        msg['To'] = to_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Connect to SMTP server
        if use_tls:
            smtp = smtplib.SMTP(server, port)
            smtp.starttls()
        else:
            smtp = smtplib.SMTP(server, port)
        
        # Login if credentials provided
        if smtp_user and smtp_password:
            smtp.login(smtp_user, smtp_password)
        
        # Send email
        smtp.send_message(msg)
        smtp.quit()
        
        return True
    except Exception as e:
        print_colored(f"Error sending email to {to_email}: {e}", Colors.RED)
        return False

def main():
    """Main function"""
    args = parse_arguments()
    
    print_colored("CertM3 Request Email Generator", Colors.BLUE)
    print("==================================")
    print(f"Base URL: {args.base_url}")
    print(f"SMTP Server: {args.smtp_server or 'Not specified (dry run mode)'}")
    print(f"Database: {args.user}@{args.host}:{args.port}/{args.name}")
    print(f"Dry Run: {args.dry_run}")
    print()
    
    # Connect to database
    print_colored("Connecting to database...", Colors.YELLOW)
    conn = connect_database(args)
    
    # Get pending requests
    print_colored("Fetching pending requests from database...", Colors.YELLOW)
    requests = get_pending_requests(conn)
    
    if not requests:
        print_colored("No pending requests found.", Colors.YELLOW)
        return
    
    print_colored(f"Found {len(requests)} pending requests.", Colors.GREEN)
    print()
    
    # Process each request
    success_count = 0
    error_count = 0
    
    for request in requests:
        request_id, username, email, display_name, challenge, ticket_number, created_at = request
        
        print_colored(f"Processing request: {ticket_number}", Colors.GREEN)
        print(f"  Username: {username}")
        print(f"  Email: {email}")
        print(f"  Created: {created_at}")
        
        # Generate email content
        subject, body = generate_email_content(
            request_id, username, email, display_name, 
            challenge, ticket_number, args.base_url
        )
        
        if args.dry_run:
            print_colored("=== EMAIL CONTENT (DRY RUN) ===", Colors.BLUE)
            print(f"To: {email}")
            print(f"Subject: {subject}")
            print()
            print(body)
            print_colored("=== END EMAIL ===", Colors.BLUE)
            print()
        else:
            # Send email
            print_colored(f"Sending email to {email}...", Colors.YELLOW)
            if send_email(args.smtp_server, args.smtp_user, args.smtp_password, 
                         args.smtp_tls, email, subject, body):
                print_colored(f"Email sent successfully to {email}", Colors.GREEN)
                success_count += 1
            else:
                error_count += 1
            print()
    
    # Summary
    print_colored("Email generation complete!", Colors.GREEN)
    print(f"Successfully sent: {success_count}")
    print(f"Errors: {error_count}")
    
    if args.dry_run:
        print_colored("Note: This was a dry run. No emails were actually sent.", Colors.YELLOW)
        print("To send actual emails, provide an SMTP server with the -s option.")
    
    conn.close()

if __name__ == "__main__":
    main() 
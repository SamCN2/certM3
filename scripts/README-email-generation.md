# Email Generation Scripts

This directory contains scripts for generating emails from request entries in the CertM3 database.

## Scripts

### 1. `generate-request-emails.sh` (Bash)
A bash script for generating emails from request entries.

**Features:**
- Configurable base URL and SMTP server
- Dry run mode for testing
- PostgreSQL database integration
- Colored output for better readability

**Usage:**
```bash
# Dry run - print emails to stdout
./generate-request-emails.sh -b "https://urp.ogt11.com" --dry-run

# Send emails via SMTP
./generate-request-emails.sh -b "https://urp.ogt11.com" -s "smtp.gmail.com:587"

# Custom database connection
./generate-request-emails.sh -b "https://urp.ogt11.com" -s "smtp.gmail.com:587" \
  -h "db.example.com" -p "5432" -n "certm3" -u "certm3"
```

### 2. `generate-request-emails.py` (Python)
A Python script with enhanced email handling capabilities.

**Features:**
- Better SMTP handling with TLS support
- SMTP authentication
- More robust error handling
- Detailed logging

**Usage:**
```bash
# Dry run - print emails to stdout
python3 generate-request-emails.py -b "https://urp.ogt11.com" --dry-run

# Send emails via SMTP with TLS
python3 generate-request-emails.py -b "https://urp.ogt11.com" \
  -s "smtp.gmail.com:587" --smtp-tls

# With SMTP authentication
python3 generate-request-emails.py -b "https://urp.ogt11.com" \
  -s "smtp.gmail.com:587" --smtp-user "your-email@gmail.com" \
  --smtp-password "your-app-password" --smtp-tls
```

### 3. `email-config.example.sh` (Configuration)
Example configuration file for easy setup.

**Setup:**
```bash
# Copy the example configuration
cp email-config.example.sh email-config.sh

# Edit the configuration
nano email-config.sh

# Source the configuration
source email-config.sh

# Run the script
./generate-request-emails.sh -b "$BASE_URL" --dry-run
```

## Prerequisites

### For Bash Script
- `psql` command-line tool (PostgreSQL client)
- `mail` command or `curl` for email sending
- Bash shell

### For Python Script
- Python 3.6+
- `psycopg2` library: `pip install psycopg2-binary`
- SMTP access

## Installation

### Install PostgreSQL Client (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install postgresql-client
```

### Install Python Dependencies
```bash
pip3 install psycopg2-binary
```

## Configuration

### Database Connection
The scripts connect to the CertM3 database to fetch pending requests. Configure the connection using:

- `--host`: Database host (default: localhost)
- `--port`: Database port (default: 5432)
- `--name`: Database name (default: certm3)
- `--user`: Database user (default: certm3)

### SMTP Configuration
For sending emails, configure your SMTP server:

- `--smtp-server`: SMTP server and port (e.g., "smtp.gmail.com:587")
- `--smtp-user`: SMTP username (if required)
- `--smtp-password`: SMTP password (if required)
- `--smtp-tls`: Use TLS encryption

### Environment Variables
You can also set database password via environment variable:
```bash
export DB_PASSWORD="your-database-password"
```

## Email Content

The generated emails include:

- **Subject**: "CertM3 Certificate Request Validation - [TICKET_NUMBER]"
- **Validation Link**: Direct link to validate the request
- **Validation Code**: Manual code entry option
- **Request Details**: Username, email, display name, ticket number
- **Support Information**: Contact details and ticket reference

## Use Cases

### 1. Testing Email Validation Flow
```bash
# Generate test emails without sending
./generate-request-emails.sh -b "https://urp.ogt11.com" --dry-run
```

### 2. Admin Notifications
```bash
# Send emails to all pending requests
./generate-request-emails.sh -b "https://urp.ogt11.com" -s "smtp.company.com:587"
```

### 3. Bulk Email Processing
```bash
# Process requests in batches
python3 generate-request-emails.py -b "https://urp.ogt11.com" \
  -s "smtp.gmail.com:587" --smtp-tls
```

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check database credentials
- Ensure network connectivity to database

### SMTP Issues
- Verify SMTP server and port
- Check authentication credentials
- Test SMTP connection manually
- For Gmail, use App Passwords instead of regular passwords

### Permission Issues
```bash
# Make scripts executable
chmod +x generate-request-emails.sh
chmod +x email-config.example.sh
```

## Security Considerations

1. **Database Password**: Store securely, use environment variables
2. **SMTP Credentials**: Use App Passwords for Gmail, avoid plain text storage
3. **Email Content**: Review email content before sending to production
4. **Rate Limiting**: Be mindful of SMTP rate limits

## Examples

### Gmail SMTP Setup
```bash
# Using Gmail SMTP
./generate-request-emails.sh \
  -b "https://urp.ogt11.com" \
  -s "smtp.gmail.com:587" \
  --smtp-user "your-email@gmail.com" \
  --smtp-password "your-app-password" \
  --smtp-tls
```

### Custom SMTP Server
```bash
# Using company SMTP server
./generate-request-emails.sh \
  -b "https://urp.ogt11.com" \
  -s "mail.company.com:25"
```

### Testing with Dry Run
```bash
# Test email generation without sending
./generate-request-emails.sh \
  -b "https://urp.ogt11.com" \
  --dry-run
```

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review database and SMTP configuration
3. Test with dry run mode first
4. Check system logs for detailed error messages 
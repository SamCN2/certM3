#!/bin/bash

# CertM3 Email Generation Configuration
# Copy this file to email-config.sh and modify the values

# Base URL for the application
export BASE_URL="https://urp.ogt11.com"

# SMTP Configuration
export SMTP_SERVER="smtp.gmail.com:587"
export SMTP_USER="your-email@gmail.com"
export SMTP_PASSWORD="your-app-password"
export SMTP_TLS="true"

# Database Configuration
export DB_HOST="localhost"
export DB_PORT="5432"
export DB_NAME="certm3"
export DB_USER="certm3"
export DB_PASSWORD="your-db-password"

# Email Configuration
export FROM_EMAIL="noreply@certm3.local"
export REPLY_TO="admin@certm3.local"

# Usage examples:
# 
# 1. Dry run (print emails to stdout):
#    source email-config.sh
#    ./generate-request-emails.sh -b "$BASE_URL" --dry-run
#
# 2. Send emails via SMTP:
#    source email-config.sh
#    ./generate-request-emails.sh -b "$BASE_URL" -s "$SMTP_SERVER"
#
# 3. Using Python script:
#    source email-config.sh
#    python3 generate-request-emails.py -b "$BASE_URL" -s "$SMTP_SERVER" --smtp-tls
#
# 4. With custom database:
#    source email-config.sh
#    ./generate-request-emails.sh -b "$BASE_URL" -s "$SMTP_SERVER" -h "$DB_HOST" -p "$DB_PORT" -n "$DB_NAME" -u "$DB_USER" 
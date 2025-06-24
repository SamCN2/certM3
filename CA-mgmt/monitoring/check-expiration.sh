#!/bin/bash
# check-expiration.sh: Warn if any CA certs expire within 30 days

CA_DIRS=(
    "../certs/intermediate/user-ca"
    "../certs/intermediate/database-ca"
    "../certs/intermediate/api-ca"
)

WARNING_DAYS=30

for ca_dir in "${CA_DIRS[@]}"; do
    if [ -f "$ca_dir/ca.crt" ]; then
        expiry_date=$(openssl x509 -in "$ca_dir/ca.crt" -noout -enddate | cut -d= -f2)
        expiry_epoch=$(date -d "$expiry_date" +%s)
        current_epoch=$(date +%s)
        days_remaining=$(( (expiry_epoch - current_epoch) / 86400 ))
        if [ $days_remaining -lt $WARNING_DAYS ]; then
            echo "WARNING: $ca_dir/ca.crt expires in $days_remaining days ($expiry_date)"
        fi
    fi
done 
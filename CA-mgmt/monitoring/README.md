# Monitoring CA Certificate Expiration

This directory contains scripts to monitor the expiration dates of CA certificates.

## check-expiration.sh

- Scans all intermediate CA certificates (user, database, API)
- Warns if any certificate will expire within 30 days
- Intended to be run periodically (e.g., via cron)

## Usage

```sh
./check-expiration.sh
```

## Output Example
```
WARNING: ../certs/intermediate/user-ca/ca.crt expires in 12 days (YYYY-MM-DD HH:MM:SS GMT)
```

## Recommendation
- Set up a cron job or monitoring alert to run this script regularly and notify administrators of impending expirations. 
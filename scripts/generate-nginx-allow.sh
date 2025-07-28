#!/bin/ksh
# Copyright 2025 ogt11.com, llc
# Generate nginx allow directives for the current machine's IP addresses

set -e

# Get the machine's hostname for the comment
HOSTNAME=$(hostname -f 2>/dev/null || hostname)

echo "# Auto-generated allow directives for $HOSTNAME"
echo "# Generated on $(date)"
echo "#"

# Get local interface IP addresses and strip the /XX subnet notation
ip address list | nawk '$1 ~ /inet.*/ {print $2}' | while read ipaddress
do
    # Remove the /XX subnet notation
    clean_ip=$(echo "$ipaddress" | sed 's|/.*||')
    echo "allow $clean_ip;"
done

echo "deny all;" 
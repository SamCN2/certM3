#!/bin/bash

# Create a temporary file for the psql output
TMPFILE=$(mktemp)

# Run psql commands and capture output
psql -d certm3 -c "\d+ groups" > "$TMPFILE"
psql -d certm3 -c "\d+ user_groups" >> "$TMPFILE"
psql -d certm3 -c "\d+ users" >> "$TMPFILE"
psql -d certm3 -c "\d+ certificates" >> "$TMPFILE"
psql -d certm3 -c "\d+ requests" >> "$TMPFILE"

# Create the markdown file with the schema
cat > docs/api-db-as-built.md << 'EOF'
# CertM3 API Database Schema

## Groups Table
EOF

# Extract and format the groups table info
sed -n '/Table "public.groups"/,/Access method:/p' "$TMPFILE" >> docs/api-db-as-built.md

echo -e "\n## User Groups Table" >> docs/api-db-as-built.md
sed -n '/Table "public.user_groups"/,/Access method:/p' "$TMPFILE" >> docs/api-db-as-built.md

echo -e "\n## Users Table" >> docs/api-db-as-built.md
sed -n '/Table "public.users"/,/Access method:/p' "$TMPFILE" >> docs/api-db-as-built.md

echo -e "\n## Certificates Table" >> docs/api-db-as-built.md
sed -n '/Table "public.certificates"/,/Access method:/p' "$TMPFILE" >> docs/api-db-as-built.md

echo -e "\n## Requests Table" >> docs/api-db-as-built.md
sed -n '/Table "public.requests"/,/Access method:/p' "$TMPFILE" >> docs/api-db-as-built.md

# Clean up
rm "$TMPFILE"

echo "Database schema has been saved to docs/api-db-as-built.md" 
#!/bin/bash

# Generate random username
testusername="testuser$RANDOM"

# Check username availability
while true; do
    response=$(curl -s "http://localhost:3001/app/check-username/$testusername")
    if echo "$response" | grep -q '"available":true'; then
        break
    fi
    testusername="testuser$RANDOM"
done

# Submit request
curl -s -X POST http://localhost:3001/app/request \
    -H "Content-Type: application/json" \
    -d "{
        \"username\": \"$testusername\",
        \"email\": \"$testusername@test.com\",
        \"displayName\": \"Test User\"
    }"

# Extract validation link
grep -h "https://.*/app/validate/" /var/spool/certM3/test-emails/*$testusername* 
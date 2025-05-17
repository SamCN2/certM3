#!/bin/bash

# Generate random username (3-20 chars, alphanumeric + underscore)
testusername="test$(printf "%04d" $((RANDOM % 10000)))"

# Check username availability
while true; do
    response=$(curl -s "http://localhost:3001/app/check-username/$testusername")
    if echo "$response" | grep -q '"available":true'; then
        break
    fi
    testusername="test$(printf "%04d" $((RANDOM % 10000)))"
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

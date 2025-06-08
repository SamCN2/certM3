#!/bin/bash

# Generate random username (3-20 chars, alphanumeric + underscore)
testusername="test$(printf "%04d" $((RANDOM % 10000)))"

# Check username availability
while true; do
    response=$(curl -s "https://urp.ogt11.com/app/request/check-username/$testusername")
    if echo "$response" | grep -q '"available":true'; then
        break
    fi
    # Generate new username if current one is taken
    testusername="test$(printf "%04d" $((RANDOM % 10000)))"
    echo "Username $testusername taken, trying another..."
done

echo "Using username: $testusername"

# Submit request
response=$(curl -s -X POST https://urp.ogt11.com/app/request \
    -H "Content-Type: application/json" \
    -d "{
        \"username\": \"$testusername\",
        \"email\": \"$testusername@test.com\",
        \"displayName\": \"Test User\"
    }")

# Extract request ID from response
requestId=$(echo "$response" | grep -o '"requestId":"[^"]*"' | cut -d'"' -f4)

# Extract validation link and challenge
validationLink=$(grep -h "https://.*/app/validate/.*challenge-.*" /var/spool/certM3/test-emails/*$testusername*)
challenge=$(echo "$validationLink" | grep -o "challenge-[^/]*" | cut -d'-' -f2)

echo "Request ID: $requestId"
echo "Challenge: $challenge"

# Validate the request
echo "Validating request..."
curl -v "https://urp.ogt11.com/app/validate/$requestId/$challenge"

# Wait a moment for the database to update
sleep 2

# Verify user in database
echo "Verifying user in database..."
psql -d certm3 -c "SELECT * FROM users WHERE username = '$testusername';"

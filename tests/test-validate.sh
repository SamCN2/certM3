#!/bin/bash

# Run mkrequest.sh and capture its output
output=$( cat /dev/stdin)

# Extract the request ID and challenge from the output
request_id=$(echo "$output" | grep -oP 'Request ID: \K[^ ]+')
challenge=$(echo "$output" | grep -oP 'challenge-\K[^ ]+' | head -n1)

echo "Request ID: $request_id"
echo "Challenge: $challenge"

# Verify the request exists in the database by ID
echo "Verifying request exists in the database by ID..."
psql -d certm3 -c "SELECT * FROM requests WHERE id = '$request_id';"

# Verify the request exists in the database by challenge
echo "Verifying request exists in the database by challenge..."
psql -d certm3 -c "SELECT * FROM requests WHERE challenge = 'challenge-$challenge';"

# Call the validation API
echo "Calling validation API..."
json_payload="{\"challenge\":\"challenge-$challenge\"}"
echo "JSON payload: $json_payload"
curl -v -X POST "https://urp.ogt11.com/api/requests/$request_id/validate" \
  -H "Content-Type: application/json" \
  -d "$json_payload" 

# After the validation API call, add a check for the user in the database
echo "Verifying user exists in the database..."
psql -d certm3 -c "SELECT * FROM users WHERE username = (SELECT username FROM requests WHERE challenge = 'challenge-$challenge');"

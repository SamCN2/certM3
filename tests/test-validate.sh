#!/bin/bash

# Read request ID and challenge from stdin
read -r request_id challenge

echo "Request ID: $request_id"
echo "Challenge: $challenge"

# Verify request exists in database
echo "Verifying request exists in database by ID..."
psql -d certm3 -c "SELECT * FROM requests WHERE id = '$request_id';"

# Verify request exists in database by challenge
echo "Verifying request exists in database by challenge..."
psql -d certm3 -c "SELECT * FROM requests WHERE challenge = 'challenge-$challenge';"

# Call validation endpoint through the app
echo "Calling validation endpoint..."
validation_url="https://urp.ogt11.com/app/validate/$request_id/challenge-$challenge"
echo "Validation URL: $validation_url"

response=$(curl -s -w "\n%{http_code}" -X GET "$validation_url")

# Split response into body and status code
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

echo "Response status: $http_code"
echo "Response body: $body"

if [ "$http_code" -eq 200 ]; then
  # Parse the JSON response
  success=$(echo "$body" | jq -r '.success')
  token=$(echo "$body" | jq -r '.token')
  
  if [ "$success" = "true" ] && [ -n "$token" ]; then
    echo "Validation successful, received token"
    
    # Get the request details to create user
    request_data=$(psql -d certm3 -t -c "SELECT username, email, display_name FROM requests WHERE id = '$request_id';")
    username=$(echo "$request_data" | cut -d'|' -f1 | tr -d ' ')
    email=$(echo "$request_data" | cut -d'|' -f2 | tr -d ' ')
    display_name=$(echo "$request_data" | cut -d'|' -f3 | tr -d ' ')
    
    # Create user with token
    echo "Creating user..."
    user_payload="{\"username\":\"$username\",\"email\":\"$email\",\"displayName\":\"$display_name\"}"
    echo "User payload: $user_payload"
    
    user_response=$(curl -s -w "\n%{http_code}" -X POST \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $token" \
      -d "$user_payload" \
      "https://urp.ogt11.com/api/users")
    
    user_http_code=$(echo "$user_response" | tail -n1)
    user_body=$(echo "$user_response" | sed '$d')
    
    echo "User creation response status: $user_http_code"
    echo "User creation response body: $user_body"
    
    # Verify user was created
    echo "Verifying user exists in database..."
    psql -d certm3 -c "SELECT * FROM users WHERE username = '$username';"
  else
    echo "Validation failed: Invalid response format"
    exit 1
  fi
else
  echo "Validation failed: HTTP $http_code"
  exit 1
fi

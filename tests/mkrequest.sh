#!/bin/bash

# Generate random username, email, and display name
username="testuser-$(openssl rand -hex 4)"
email="test-$(openssl rand -hex 4)@example.com"
displayName="Test User $(openssl rand -hex 4)"

# Submit the request to the API
response=$(curl -s -X POST -H "Content-Type: application/json" -d "{\"username\":\"$username\",\"email\":\"$email\",\"displayName\":\"$displayName\"}" https://urp.ogt11.com/api/requests)

# Extract the request ID from the response
requestId=$(echo $response | jq -r '.id')

# Wait for the email file to be generated
sleep 2

# Find the most recent email file for the request
emailFile=$(ls -t /var/spool/certM3/test-emails/*$username-validation.txt | head -1)

# Extract the validation link from the email file
validationLink=$(grep -o 'https://urp.ogt11.com/app/validate/[^ ]*' "$emailFile")

# Extract request ID and challenge from the validation link
requestId=$(echo "$validationLink" | grep -o '/validate/[^/]*' | cut -d'/' -f3)
challenge=$(echo "$validationLink" | grep -o 'challenge-[^/]*' | cut -d'-' -f2)

echo "Request ID: $requestId"
echo "Challenge: $challenge"

# Print the request ID and challenge for test-validate.sh
echo "$requestId $challenge"

# Verify the validation link response
validationResponse=$(curl -s -o /dev/null -w "%{http_code}" "$validationLink")
echo "Validation Response Code: $validationResponse"

if [ "$validationResponse" -eq 200 ]; then
    echo "Validation page returned successfully."
elif [ "$validationResponse" -eq 300 ]; then
    redirectUrl=$(curl -s -o /dev/null -w "%{redirect_url}" "$validationLink")
    echo "Redirect detected to: $redirectUrl"
else
    echo "Unexpected response code: $validationResponse"
fi

# Print the validation link to stdout
echo "$validationLink" 
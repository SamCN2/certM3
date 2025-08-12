#!/bin/bash

# This script checks that the basic API views are accessible.
# It requires API_BASE_URL and JWT to be set in the environment.

# Exit on error
set -e

# Check for required environment variables
if [ -z "$API_BASE_URL" ] || [ -z "$JWT" ]; then
    echo "Error: Please set the API_BASE_URL and JWT environment variables."
    echo "See README.md for instructions."
    exit 1
fi

echo "--- Checking API Views ---"

# Function to make an API call and check the response
check_endpoint() {
    local endpoint=$1
    echo -n "Checking ${endpoint}... "

    # Use curl to make the request.
    # -s for silent, -f to fail on server errors (like 4xx or 5xx).
    # The output is piped to jq to check if it's a valid JSON array.
    response=$(curl -sf -H "Authorization: Bearer ${JWT}" "${API_BASE_URL}${endpoint}")

    # Check if jq can parse the output as an array
    if echo "$response" | jq -e 'type == "array"' > /dev/null; then
        echo "OK (received an array)"
    else
        echo "FAIL"
        echo "Response was not a valid JSON array:"
        echo "$response"
        exit 1
    fi
}

# Check the main views
check_endpoint "/users"
check_endpoint "/groups"
check_endpoint "/certificates"
check_endpoint "/requests"
check_endpoint "/user_groups"

echo "--- All views are accessible. ---"

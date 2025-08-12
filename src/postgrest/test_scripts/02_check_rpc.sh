#!/bin/bash

# This script checks that the get_user_groups RPC function is working.
# It requires API_BASE_URL and JWT to be set in the environment.

# Exit on error
set -e

# Check for required environment variables
if [ -z "$API_BASE_URL" ] || [ -z "$JWT" ]; then
    echo "Error: Please set the API_BASE_URL and JWT environment variables."
    echo "See README.md for instructions."
    exit 1
fi

echo "--- Checking RPC Functions ---"

# We need a user to test with. Let's assume a user 'testuser' exists.
# In a real test suite, you would create a user first.
TEST_USER="testuser"

echo "Checking /rpc/get_user_groups for user: ${TEST_USER}"

response=$(curl -sf -X POST \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: application/json" \
  -d "{\"p_username\": \"${TEST_USER}\"}" \
  "${API_BASE_URL}/rpc/get_user_groups")

# Check if jq can parse the output as an array
if echo "$response" | jq -e 'type == "array"' > /dev/null; then
    echo "OK (received an array)"
    echo "Response:"
    echo "$response" | jq .
else
    echo "FAIL"
    echo "Response was not a valid JSON array:"
    echo "$response"
    exit 1
fi

echo "--- RPC function check complete. ---"

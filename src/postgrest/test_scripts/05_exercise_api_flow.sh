#!/bin/bash

# This script tests the full user registration flow from request to user creation.
# It requires API_BASE_URL and JWT to be set in the environment.

# Exit on error
set -e

# Check for required environment variables
if [ -z "$API_BASE_URL" ] || [ -z "$JWT" ]; then
    echo "Error: Please set the API_BASE_URL and JWT environment variables."
    echo "See README.md for instructions."
    exit 1
fi

echo "--- Testing Full API Flow: User Registration ---"

# Generate a unique username for this test run
TEST_USER="flow_user_$(date +%s)"
echo "Using temporary user: ${TEST_USER}"

# 1. Create a new request
echo "Step 1: Creating a new request for '${TEST_USER}'..."
request_response=$(curl -sf -X POST \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: application/json" \
  -d "{\"p_username\": \"${TEST_USER}\", \"p_email\": \"${TEST_USER}@example.com\", \"p_display_name\": \"Flow Test User\"}" \
  "${API_BASE_URL}/rpc/create_request")

echo "Request creation response:"
echo "$request_response" | jq .

REQUEST_ID=$(echo "$request_response" | jq -r '.id')
CHALLENGE_TOKEN=$(echo "$request_response" | jq -r '.challenge')

if [ -z "$REQUEST_ID" ] || [ "$REQUEST_ID" == "null" ]; then
    echo "FAIL: Could not get request ID from response."
    exit 1
fi
if [ -z "$CHALLENGE_TOKEN" ] || [ "$CHALLENGE_TOKEN" == "null" ]; then
    echo "FAIL: Could not get challenge token from response."
    exit 1
fi

echo "OK: Request created with ID: ${REQUEST_ID}"

# 2. Validate the request and create the user
echo "Step 2: Validating request and creating user..."
user_response=$(curl -sf -X POST \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: application/json" \
  -d "{\"p_request_id\": \"${REQUEST_ID}\", \"p_challenge\": \"${CHALLENGE_TOKEN}\"}" \
  "${API_BASE_URL}/rpc/validate_request_and_create_user")

echo "User validation/creation response:"
echo "$user_response" | jq .

# Verify that the response contains the new user's details
created_username=$(echo "$user_response" | jq -r '.username')
if [ "$created_username" != "$TEST_USER" ]; then
    echo "FAIL: The created user's username does not match the requested username."
    exit 1
fi

echo "OK: User successfully created from request."

# 3. Verify the user's groups
echo "Step 3: Verifying groups for '${TEST_USER}'..."
groups_response=$(curl -sf -X POST \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: application/json" \
  -d "{\"p_username\": \"${TEST_USER}\"}" \
  "${API_BASE_URL}/rpc/get_user_groups")

# Check that the response contains the user's own group
if ! echo "$groups_response" | jq -e --arg user "$TEST_USER" '.[] | select(.group_name == $user)' > /dev/null; then
    echo "FAIL: User's personal group '${TEST_USER}' not found in their group list."
    echo "Response:"
    echo "$groups_response" | jq .
    exit 1
fi
echo "OK: Found user's personal group."

# Check that the response contains the 'users' group
if ! echo "$groups_response" | jq -e '.[] | select(.group_name == "users")' > /dev/null; then
    echo "FAIL: Default 'users' group not found in their group list."
    echo "Response:"
    echo "$groups_response" | jq .
    exit 1
fi
echo "OK: Found default 'users' group."


echo "--- API flow test successful. ---"

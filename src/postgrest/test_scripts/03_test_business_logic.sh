#!/bin/bash

# This script tests the core business logic of user creation and group association.
# It requires API_BASE_URL and JWT to be set in the environment.

# Exit on error
set -e

# Check for required environment variables
if [ -z "$API_BASE_URL" ] || [ -z "$JWT" ]; then
    echo "Error: Please set the API_BASE_URL and JWT environment variables."
    echo "See README.md for instructions."
    exit 1
fi

echo "--- Testing Business Logic: User Creation ---"

# Generate a unique username for this test run
TEST_USER="test_$(date +%s)"
echo "Using temporary user: ${TEST_USER}"

# 1. Create the user by calling the RPC function
echo "Calling /rpc/create_new_user_with_groups..."
create_response=$(curl -sf -X POST \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: application/json" \
  -d "{\"p_username\": \"${TEST_USER}\", \"p_email\": \"${TEST_USER}@example.com\", \"p_display_name\": \"Test User\"}" \
  "${API_BASE_URL}/rpc/create_new_user_with_groups")

# Check that the response is a single JSON object (not an array)
if ! echo "$create_response" | jq -e 'type == "object"' > /dev/null; then
    echo "FAIL: Expected a single JSON object from user creation."
    echo "Response:"
    echo "$create_response"
    exit 1
fi

echo "User creation successful. Response:"
echo "$create_response" | jq .

# 2. Verify the user exists via the /users view
echo "Verifying user exists via /users view..."
user_response=$(curl -sf -H "Authorization: Bearer ${JWT}" "${API_BASE_URL}/users?username=eq.${TEST_USER}")

user_count=$(echo "$user_response" | jq '. | length')
if [ "$user_count" -ne 1 ]; then
    echo "FAIL: Expected to find 1 user named ${TEST_USER}, but found ${user_count}."
    echo "Response:"
    echo "$user_response" | jq .
    exit 1
fi

echo "OK: User found in /users view."

# 3. Verify the user's groups
echo "Verifying user's groups via /rpc/get_user_groups..."
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

echo "--- Business logic test successful. ---"

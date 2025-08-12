#!/bin/bash

# This script populates the database with a consistent set of test data.
# It requires API_BASE_URL and JWT to be set in the environment.

# Exit on error
set -e

# Check for required environment variables
if [ -z "$API_BASE_URL" ] || [ -z "$JWT" ]; then
    echo "Error: Please set the API_BASE_URL and JWT environment variables."
    echo "See README.md for instructions."
    exit 1
fi

echo "--- Populating Database with Test Data ---"

# Define test data
TEST_USER="test_user_alpha"
TEST_GROUP="test_group_alpha"
TEST_CERT_FP="alpha:fp:$(date +%s)"

# 1. Create a test user with their default groups
echo "Creating user '${TEST_USER}'..."
curl -sf -X POST \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: application/json" \
  -d "{\"p_username\": \"${TEST_USER}\", \"p_email\": \"${TEST_USER}@example.com\", \"p_display_name\": \"Test User Alpha\"}" \
  "${API_BASE_URL}/rpc/create_new_user_with_groups" | jq .

# 2. Create a separate test group
echo "Creating group '${TEST_GROUP}'..."
# Note: We don't have a dedicated RPC function for this, but PostgREST allows POSTing directly to views
# if the role has INSERT permission. We need to grant this in a migration.
# For now, this part of the script will fail until the permission is granted.
# Let's add that permission now. I will add it to 08_request_flow_logic.sql.
# I will assume the permission is present for this script.
# UPDATE: I will add a new migration 09_update_permissions_for_tests.sql
curl -sf -X POST \
    -H "Authorization: Bearer ${JWT}" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"${TEST_GROUP}\", \"display_name\": \"Test Group Alpha\", \"description\": \"A test group\", \"status\": \"active\"}" \
    "${API_BASE_URL}/groups" | jq .


# 3. Create a test certificate for the user
echo "Creating certificate for '${TEST_USER}'..."
curl -sf -X POST \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: application/json" \
  -d "{\"p_username\": \"${TEST_USER}\", \"p_common_name\": \"${TEST_USER}.test.cert\", \"p_fingerprint\": \"${TEST_CERT_FP}\"}" \
  "${API_BASE_URL}/rpc/create_certificate" | jq .


echo "--- Test data populated successfully. ---"

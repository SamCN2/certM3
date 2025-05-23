#!/bin/bash

API_URL="https://urp.ogt11.com/api"
GROUP_NAME="test-group-$(date +%s)"
DISPLAY_NAME="Test Group"
TEST_USER_ID="6256ad5f-df64-4613-a8de-71129ef928bf"  # Using a real UUID from the logs

set -e

echo "Creating group: $GROUP_NAME"
echo "Running curl command: curl -v -X POST '$API_URL/groups' -H 'Content-Type: application/json' -d '{\"name\": \"$GROUP_NAME\", \"displayName\": \"$DISPLAY_NAME\"}'"
CREATE_RESPONSE=$(curl -v -X POST "$API_URL/groups" \
  -H 'Content-Type: application/json' \
  -d '{"name": "'$GROUP_NAME'", "displayName": "'$DISPLAY_NAME'"}')
echo "Create response: $CREATE_RESPONSE"

# After creating the group, we should add a test user to it
echo "Adding test user to group: $GROUP_NAME"
echo "Running curl command: curl -v -X POST '$API_URL/groups/$GROUP_NAME/members' -H 'Content-Type: application/json' -d '{\"userIds\": [\"$TEST_USER_ID\"]}'"
ADD_MEMBER_RESPONSE=$(curl -v -X POST "$API_URL/groups/$GROUP_NAME/members" \
  -H 'Content-Type: application/json' \
  -d '{"userIds": ["'$TEST_USER_ID'"]}')
echo "Add member response: $ADD_MEMBER_RESPONSE"

# Get the group members
echo "Getting group members: $GROUP_NAME"
echo "Running curl command: curl -v '$API_URL/groups/$GROUP_NAME/members'"
GET_MEMBERS_RESPONSE=$(curl -v "$API_URL/groups/$GROUP_NAME/members")
echo "Get members response: $GET_MEMBERS_RESPONSE"

# Delete the group
echo "Deleting group: $GROUP_NAME"
echo "Running curl command: curl -v -X DELETE '$API_URL/groups/$GROUP_NAME'"
DELETE_RESPONSE=$(curl -v -X DELETE "$API_URL/groups/$GROUP_NAME")
echo "Delete response: $DELETE_RESPONSE" 
#!/bin/bash


# Base URL for the API
BASE_URL="https://urp.ogt11.com/api"

# Function to get user ID from username
get_user_id() {
    local username=$1
    local user_id=$(curl -s "${BASE_URL}/users/username/${username}" | jq -r '.id')
    if [ "$user_id" == "null" ] || [ -z "$user_id" ]; then
        echo "Error: Could not find user with username ${username}"
        exit 1
    fi
    echo "$user_id"
}

# Function to check if user is in a group
check_group_membership() {
    local user_id=$1
    local group_name=$2
    local in_group=$(curl -s "${BASE_URL}/users/${user_id}/groups" | jq -r --arg group "$group_name" '.[] | select(. == $group)')
    if [ -n "$in_group" ]; then
        return 0
    else
        return 1
    fi
}

# Get username from user
echo "Enter username to fix groups for:"
read username

# Get user ID
echo "Looking up user ID for ${username}..."
user_id=$(get_user_id "$username")
echo "Found user ID: ${user_id}"

# Check if self group exists
echo "Checking if self group exists..."
self_group_exists=$(curl -s "${BASE_URL}/groups/${username}" | jq -r '.name')
if [ "$self_group_exists" == "null" ]; then
    echo "Creating self group for ${username}..."
    curl -s -X POST "${BASE_URL}/groups" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"${username}\",
            \"displayName\": \"${username}'s Group\",
            \"description\": \"Personal group for ${username}\"
        }"
    echo "Self group created."
else
    echo "Self group already exists."
fi

# Add user to self group if not already a member
if ! check_group_membership "$user_id" "$username"; then
    echo "Adding user to self group..."
    curl -s -X POST "${BASE_URL}/groups/${username}/members" \
        -H "Content-Type: application/json" \
        -d "{
            \"userIds\": [\"${user_id}\"]
        }"
    echo "User added to self group."
else
    echo "User already in self group."
fi

# Add user to users group if not already a member
if ! check_group_membership "$user_id" "users"; then
    echo "Adding user to users group..."
    curl -s -X POST "${BASE_URL}/groups/users/members" \
        -H "Content-Type: application/json" \
        -d "{
            \"userIds\": [\"${user_id}\"]
        }"
    echo "User added to users group."
else
    echo "User already in users group."
fi

# Verify final group membership
echo "Verifying group membership..."
echo "User's groups:"
curl -s "${BASE_URL}/users/${user_id}/groups" | jq -r '.[]' 

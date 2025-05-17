#!/bin/bash

# Script to find and fix users missing from the users group
echo "Checking for users missing from the 'users' group..."

# Get all users
USERS=$(curl -s "http://localhost:3001/api/users" | jq -r '.[].username')

# Counter for fixes
FIXED=0
FAILED=0

for username in $USERS; do
    echo "Checking user: $username"
    
    # Get user's groups
    GROUPS=$(curl -s "http://localhost:3001/api/users/$username/groups" | jq -r '.[]')
    
    # Check if user is in users group
    if ! echo "$GROUPS" | grep -q "^users$"; then
        echo "User $username is not in 'users' group. Adding..."
        
        # Add user to users group
        RESPONSE=$(curl -s -X POST "http://localhost:3001/api/users/$username/groups" \
            -H "Content-Type: application/json" \
            -d '{"groups": ["users"]}')
        
        if [ $? -eq 0 ]; then
            echo "Successfully added $username to 'users' group"
            FIXED=$((FIXED + 1))
        else
            echo "Failed to add $username to 'users' group"
            FAILED=$((FAILED + 1))
        fi
    else
        echo "User $username is already in 'users' group"
    fi
done

echo "Summary:"
echo "Fixed: $FIXED users"
echo "Failed: $FAILED users" 
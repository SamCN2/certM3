#!/bin/ksh

# Base URL for the API
BASE_URL="http://localhost:3000/api"

# Step 1: Fetch a user ID that is not in any group
echo "Fetching a user ID that is not in any group..."
psql -d certm3 -c 'SELECT u.id FROM users u LEFT JOIN user_groups ug ON u.id = ug.user_id WHERE ug.user_id IS NULL LIMIT 1;' > /tmp/sqlbucket

uidng=$( head -n 3 /tmp/sqlbucket |tail -n 1 | sed -e 's/ //g' )

echo "Found user ID: >${uidng}<"

# Check if uidng is empty
if [ -z "$uidng" ]; then
    echo "No users found that are not in any group."
    exit 1
fi

# Step 2: Add the user to the 'users' group
echo "Adding user $uidng to the 'users' group..."
curl -X POST "$BASE_URL/groups/users/members" \
     -H "Content-Type: application/json" \
     -d "{\"userIds\": [\"$uidng\"]}" \
     -v

echo "User added to the 'users' group." 

psql -d certm3 -c "select user_id,group_name from user_groups where user_id = '${uidng}' ; "

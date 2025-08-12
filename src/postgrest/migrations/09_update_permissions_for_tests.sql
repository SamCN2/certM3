-- This script adds permissions required for the test scripts to function.

-- Grant INSERT permission on the 'groups' view to the 'web_user' role.
-- This allows the test data population script to create a test group.
GRANT INSERT ON api.groups TO web_user;

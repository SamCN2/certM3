-- This script updates permissions to allow for public-facing checks.

-- Grant SELECT permission on the 'username' column of the 'users' view
-- to the 'anonymous' role. This allows the unauthenticated CheckUsername
-- endpoint to function without exposing any other user data.
GRANT SELECT (username) ON api.users TO anonymous;

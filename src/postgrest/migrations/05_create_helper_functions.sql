-- This script creates helper functions in the database to encapsulate
-- business logic, making the client-side code simpler and more efficient.

-- Function to get all group names for a given user.
-- This replaces two separate API calls in the original middleware with a single RPC call.
CREATE OR REPLACE FUNCTION api.get_user_groups(p_username TEXT)
RETURNS TABLE(group_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT ug.group_name
  FROM public.user_groups ug
  JOIN public.users u ON ug.user_id = u.id
  WHERE u.username = p_username;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the function to the web_user role.
GRANT EXECUTE ON FUNCTION api.get_user_groups(TEXT) TO web_user;

-- Also, add INSERT permission on the certificates view so the client can store metadata.
GRANT INSERT ON api.certificates TO web_user;

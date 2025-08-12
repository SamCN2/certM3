-- This script demonstrates how to move business logic and authorization
-- into the database using PostgreSQL functions and Row-Level Security (RLS).

-- Enable Row-Level Security on the 'users' table.
-- This is a prerequisite for adding any policies.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create an RLS policy on the 'users' table.
-- This policy ensures that a user can only see and modify their own record.
-- The current user's identity is determined by the 'request.jwt.claims' setting,
-- which PostgREST sets based on the incoming JWT.
CREATE POLICY user_self_access ON public.users
  FOR ALL
  TO web_user
  USING (username = current_setting('request.jwt.claims', true)::jsonb ->> 'username')
  WITH CHECK (username = current_setting('request.jwt.claims', true)::jsonb ->> 'username');

-- Note: The 'username' claim is used here for simplicity. In a real system,
-- a non-reassignable identifier like a user ID from the JWT 'sub' claim
-- would be more robust. We assume the JWT will contain: { "role": "web_user", "username": "..." }


--- Function to handle creating a new user ---
-- This function replicates the business logic of a 'createUser' controller.
-- PostgREST will expose this as a callable RPC endpoint at POST /rpc/create_user.

CREATE OR REPLACE FUNCTION api.create_user(
  p_username TEXT,
  p_email TEXT,
  p_display_name TEXT -- Note: display_name is on the 'requests' table in the old schema, not users.
                      -- This is a simplified example. We'll assume it's desired on the user record.
)
RETURNS api.users AS $$
DECLARE
  new_user public.users;
BEGIN
  -- Basic validation
  IF p_username IS NULL OR p_email IS NULL THEN
    RAISE EXCEPTION 'Username and email are required.';
  END IF;

  -- Insert the new user into the public table
  INSERT INTO public.users (username, email, status, created_at, updated_at)
  VALUES (p_username, p_email, 'active', now(), now())
  RETURNING * INTO new_user;

  -- Return the newly created user record by querying the API view
  -- This ensures the function output matches the API's public structure.
  RETURN (SELECT u FROM api.users u WHERE u.id = new_user.id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function to the web_user role
GRANT EXECUTE ON FUNCTION api.create_user(TEXT, TEXT, TEXT) TO web_user;

-- The SECURITY DEFINER clause makes the function run with the permissions
-- of the user who defined it (the owner), not the user who calls it.
-- This is necessary to bypass the RLS policy for the initial INSERT.
-- The RLS policy will still apply for any subsequent SELECTs within the session.
-- Ensure the owner of this function has the necessary INSERT permissions on public.users.
-- Typically, the user running the migrations would be the owner.

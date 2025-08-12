-- This script creates a function to handle the business logic of creating
-- a new user and associating them with the correct default groups.
-- This encapsulates the logic described in the 'group-add-omission-spec.md'.

CREATE OR REPLACE FUNCTION api.create_new_user_with_groups(
  p_username TEXT,
  p_email TEXT,
  p_display_name TEXT
)
RETURNS api.users AS $$
DECLARE
  new_user public.users;
  new_group public.groups;
BEGIN
  -- 1. Create the new user
  INSERT INTO public.users (username, email, status, created_at, updated_at)
  VALUES (p_username, p_email, 'active', now(), now())
  RETURNING * INTO new_user;

  -- 2. Create a group with the user's username (if it doesn't exist)
  INSERT INTO public.groups (name, display_name, description, status, created_at, updated_at)
  VALUES (p_username, p_display_name || '''s Group', 'Personal group for ' || p_display_name, 'active', now(), now())
  ON CONFLICT (name) DO NOTHING
  RETURNING * INTO new_group;

  -- If the group already existed, select it
  IF new_group IS NULL THEN
    SELECT * INTO new_group FROM public.groups WHERE name = p_username;
  END IF;

  -- 3. Add the user to their own group
  INSERT INTO public.user_groups (user_id, group_name, created_at, updated_at)
  VALUES (new_user.id, new_group.name, now(), now());

  -- 4. Add the user to the default 'users' group
  INSERT INTO public.user_groups (user_id, group_name, created_at, updated_at)
  VALUES (new_user.id, 'users', now(), now());

  -- 5. Return the newly created user record by querying the API view
  RETURN (SELECT u FROM api.users u WHERE u.id = new_user.id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function to the web_user role
GRANT EXECUTE ON FUNCTION api.create_new_user_with_groups(TEXT, TEXT, TEXT) TO web_user;

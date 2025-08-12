-- This script creates functions to handle the full user request and certificate creation flow.

-- Function to create a new certificate request.
-- This would be called at the beginning of the user registration process.
CREATE OR REPLACE FUNCTION api.create_request(
  p_username TEXT,
  p_email TEXT,
  p_display_name TEXT
)
RETURNS api.requests AS $$
DECLARE
  new_request public.requests;
BEGIN
  -- The 'challenge' would typically be a secure, random token.
  -- For this example, we'll use a simple concatenation.
  INSERT INTO public.requests (username, email, display_name, status, challenge, created_at, updated_at)
  VALUES (p_username, p_email, p_display_name, 'pending', 'challenge-' || uuid_generate_v4()::text, now(), now())
  RETURNING * INTO new_request;

  RETURN (SELECT r FROM api.requests r WHERE r.id = new_request.id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate a request and create the user.
-- This function calls the existing 'create_new_user_with_groups' function internally.
CREATE OR REPLACE FUNCTION api.validate_request_and_create_user(
  p_request_id UUID,
  p_challenge TEXT
)
RETURNS api.users AS $$
DECLARE
  target_request public.requests;
  new_user api.users;
BEGIN
  -- Find the request and lock it for update
  SELECT * INTO target_request FROM public.requests WHERE id = p_request_id FOR UPDATE;

  -- Check if the request exists and is pending
  IF target_request IS NULL THEN
    RAISE EXCEPTION 'Request not found' USING ERRCODE = '40401'; -- Custom error code
  END IF;

  IF target_request.status != 'pending' THEN
    RAISE EXCEPTION 'Request is not pending' USING ERRCODE = '40001';
  END IF;

  -- Check if the challenge token matches
  IF target_request.challenge != p_challenge THEN
    RAISE EXCEPTION 'Invalid challenge token' USING ERRCODE = '40002';
  END IF;

  -- If validation passes, update the request status
  UPDATE public.requests SET status = 'approved', updated_at = now() WHERE id = p_request_id;

  -- Create the user and their groups by calling the other function
  SELECT * INTO new_user FROM api.create_new_user_with_groups(target_request.username, target_request.email, target_request.display_name);

  RETURN new_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to create a certificate for a user.
CREATE OR REPLACE FUNCTION api.create_certificate(
  p_username TEXT,
  p_common_name TEXT,
  p_fingerprint TEXT
)
RETURNS api.certificates AS $$
DECLARE
  target_user public.users;
  new_cert public.certificates;
BEGIN
  -- Find the user
  SELECT * INTO target_user FROM public.users WHERE username = p_username;
  IF target_user IS NULL THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = '40402';
  END IF;

  INSERT INTO public.certificates (
    code_version, username, user_id, common_name, email, fingerprint,
    not_before, not_after, status, created_at, updated_at
  )
  VALUES (
    'v1-test', target_user.username, target_user.id, p_common_name, target_user.email, p_fingerprint,
    now(), now() + interval '1 year', 'active', now(), now()
  )
  RETURNING * INTO new_cert;

  RETURN (SELECT c FROM api.certificates c WHERE c.serial_number = new_cert.serial_number);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Grant execute permissions on the new functions
GRANT EXECUTE ON FUNCTION api.create_request(TEXT, TEXT, TEXT) TO web_user;
GRANT EXECUTE ON FUNCTION api.validate_request_and_create_user(UUID, TEXT) TO web_user;
GRANT EXECUTE ON FUNCTION api.create_certificate(TEXT, TEXT, TEXT) TO web_user;

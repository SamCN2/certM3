-- This script creates the views in the 'api' schema that will be exposed by PostgREST.
-- These views provide a stable, read-only interface to the underlying tables.

-- View for the 'users' table
CREATE OR REPLACE VIEW api.users AS
SELECT
  id,
  username,
  email,
  status,
  created_at,
  updated_at
FROM public.users;

-- View for the 'groups' table
CREATE OR REPLACE VIEW api.groups AS
SELECT
  name,
  display_name,
  description,
  status,
  created_at,
  updated_at
FROM public.groups;

-- View for the 'certificates' table
CREATE OR REPLACE VIEW api.certificates AS
SELECT
  serial_number,
  code_version,
  username,
  common_name,
  email,
  fingerprint,
  not_before,
  not_after,
  status,
  revoked_at,
  revocation_reason,
  user_id,
  created_at,
  updated_at
FROM public.certificates;

-- View for the 'requests' table
CREATE OR REPLACE VIEW api.requests AS
SELECT
  id,
  username,
  display_name,
  email,
  status,
  challenge,
  created_at,
  updated_at
FROM public.requests;

-- View for the 'user_groups' join table
CREATE OR REPLACE VIEW api.user_groups AS
SELECT
  user_id,
  group_name,
  created_at,
  updated_at
FROM public.user_groups;


-- Grant permissions to the web_user role
-- This allows any authenticated user to read from these views.
GRANT SELECT ON api.users TO web_user;
GRANT SELECT ON api.groups TO web_user;
GRANT SELECT ON api.certificates TO web_user;
GRANT SELECT ON api.requests TO web_user;
GRANT SELECT ON api.user_groups TO web_user;

-- Note: No permissions are granted to the 'anonymous' role by default.
-- This makes all endpoints private until explicitly opened.

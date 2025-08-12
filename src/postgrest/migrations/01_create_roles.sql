-- This script creates the necessary roles for the PostgREST authentication model.

-- The 'authenticator' role is used by PostgREST to connect to the database.
-- It has login privileges but no other permissions by default.
-- It is designed to be a "chameleon" role that can switch to other roles.
-- We assume peer authentication is configured in pg_hba.conf for this user.
CREATE ROLE authenticator LOGIN NOINHERIT NOCREATEDB NOCREATEROLE NOSUPERUSER;

-- The 'anonymous' role is used for unauthenticated requests.
-- It has no login privileges and will be granted minimal (if any) permissions.
CREATE ROLE anonymous NOLOGIN;

-- The 'web_user' role is a general role for authenticated API users.
-- Client requests will impersonate this role via JWT.
-- It has no login privileges. Permissions will be granted to this role
-- to access specific API views and functions.
CREATE ROLE web_user NOLOGIN;

-- The authenticator needs to be able to switch to the other roles.
GRANT anonymous TO authenticator;
GRANT web_user TO authenticator;

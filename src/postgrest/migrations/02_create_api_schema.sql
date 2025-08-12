-- This script creates the 'api' schema that will be exposed by PostgREST.
-- This schema will contain all the views and functions that make up the API.

-- Create the schema
CREATE SCHEMA api;

-- Grant usage on the schema to the authenticator and the web_user roles.
-- The anonymous role is not granted usage here, as it should not have
-- access to the API by default. If any endpoints are to be made public,
-- they will be granted permissions explicitly.
GRANT USAGE ON SCHEMA api TO authenticator;
GRANT USAGE ON SCHEMA api TO web_user;
GRANT USAGE ON SCHEMA api TO anonymous;

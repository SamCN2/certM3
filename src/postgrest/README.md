# CertM3 PostgREST Backend

This directory contains the new backend implementation for CertM3, using [PostgREST](https://postgrest.org/). It is designed to replace the Loopback4 API in `src/api`, with the primary goal of eliminating the Node.js runtime for easier distribution.

## Philosophy

This implementation follows the PostgREST paradigm of keeping the "database as the single source of truth".
- **Authorization** is handled by PostgreSQL roles and Row-Level Security (RLS) policies.
- **Business Logic** for write operations is handled by PostgreSQL functions.
- **Read Operations** are provided through database views.

All of these database objects are defined in the `api` schema and created by the migration scripts in the `migrations/` directory.

## Running the Backend

### Prerequisites

1.  **PostgreSQL:** A running PostgreSQL server.
2.  **`psql`:** The PostgreSQL command-line client, for applying migrations.
3.  **PostgREST:** The [PostgREST binary](https://postgrest.org/en/stable/how-tos/install.html) must be installed and available in your `PATH`.

### Step 1: Apply Migrations

The SQL migration scripts in the `migrations/` directory must be applied to your database in order. These scripts are idempotent where possible.

Connect to your database (assumed to be `certm3`) and run the following commands from this directory:

```bash
psql -d certm3 -f migrations/01_create_roles.sql
psql -d certm3 -f migrations/02_create_api_schema.sql
psql -d certm3 -f migrations/03_create_api_views.sql
psql -d certm3 -f migrations/04_create_functions_and_rls.sql
```

### Step 2: Run the PostgREST Server

Once the database is prepared, you can start the PostgREST server. From this directory (`src/postgrest`), run:

```bash
postgrest postgrest.conf
```

The server will start and listen for requests on port 3000 by default.

## Interacting with the API

### Authentication

API access requires a valid JSON Web Token (JWT). The JWT must be passed in the `Authorization` header as a Bearer token.

The JWT payload **must** contain a `role` claim corresponding to a database role (e.g., `web_user`) and any other claims needed by RLS policies (e.g., `username`).

**Example JWT Payload:**
```json
{
  "role": "web_user",
  "username": "testuser",
  "exp": 1672531199
}
```

### Example Requests

Here are some example `curl` commands. Replace `YOUR_JWT_HERE` with a valid token.

**Read from a view (GET):**
```bash
curl http://localhost:3000/users \
  -H "Authorization: Bearer YOUR_JWT_HERE"
```

**Call a function (POST to RPC):**
```bash
curl http://localhost:3000/rpc/create_user \
  -X POST \
  -H "Authorization: Bearer YOUR_JWT_HERE" \
  -H "Content-Type: application/json" \
  -d '{ "p_username": "newuser", "p_email": "new@example.com", "p_display_name": "New User" }'
```

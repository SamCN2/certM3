# CertM3 Go Middleware (PostgREST-enabled)

This directory contains the adapted version of the CertM3 Go middleware. It has been modified to communicate with the new PostgREST backend instead of the original Loopback4 API.

## Architecture Changes

The core logic of the middleware remains the same, but the communication with the backend API has been completely rewritten.

1.  **API Client:** The original HTTP client has been replaced with a new client in `internal/api/client.go`. This new client is specifically designed to interact with a PostgREST API.
    *   It uses PostgREST's conventions for querying (e.g., `?column=eq.value`).
    *   It expects JSON responses with `snake_case` keys.
    *   It calls database functions via the `/rpc/...` endpoint for complex operations.

2.  **Authentication Flow:** The middleware now handles two sets of JWTs:
    *   **SPA JWT:** A token received from the frontend SPA. The middleware validates this token using the `JWTSecret` from the config.
    *   **Backend JWT:** A new token that the middleware generates for every request to the PostgREST backend. This token is signed with the `BackendJWTSecret` and contains the `role` claim (e.g., `web_user`) that PostgREST requires for authorization.

3.  **Database-Driven Logic:** Complex operations, like fetching all groups for a user, have been moved into PostgreSQL functions (see `src/postgrest/migrations/05_create_helper_functions.sql`). The middleware's Go code now calls these simple, efficient functions instead of making multiple API calls.

## Configuration

The configuration is still managed by `config.yaml`. The key change is the new `backend_jwt_secret` field and the updated `backend_baseurl`.

-   **`app_server.backend_baseurl`**: This should now point to the URL of the running PostgREST server (e.g., `http://localhost:3000`).
-   **`app_server.jwt_secret`**: The secret for validating JWTs from the SPA.
-   **`app_server.backend_jwt_secret`**: The secret for signing JWTs for the PostgREST backend. This **must** match the `jwt-secret` value in your `postgrest.conf` file.

## Running the Backend

To run the full, new stack, you need to run both the PostgREST server and this adapted Go middleware.

### 1. Run the PostgREST Backend
Follow the instructions in `src/postgrest/README.md` to apply the database migrations and start the PostgREST server.

### 2. Run the Go Middleware

Once the PostgREST server is running, you can run the Go middleware from this directory (`src/mw_postgrest`).

**Build the binaries:**
```bash
make build
```

**Run the services:**
```bash
make run
```
This will start the `certm3-app` and `certm3-signer` in the background. The `certm3-app` will listen on port 8080 by default and will proxy requests to the PostgREST server on port 3000.

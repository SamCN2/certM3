# PostgREST API Test Scripts

This directory contains simple shell scripts to test that the PostgREST API is deployed correctly and that the underlying database schema and functions are working as expected.

These scripts are designed to be run directly against the PostgREST API, bypassing the Go middleware. This helps isolate issues during deployment and debugging.

## Prerequisites

1.  **`curl`**: A command-line tool for making HTTP requests.
2.  **`jq`**: A command-line JSON processor. It is used to parse and display the JSON responses.
3.  **A running PostgREST instance**: The server must be running and accessible.
4.  **A valid JWT**: The scripts require a JSON Web Token to authenticate with the API.

## Generating a JWT for Testing

You must generate a JWT signed with the same secret that is in your `postgrest.conf` file (the `jwt-secret` value).

You can use a site like [jwt.io](https://jwt.io/) to create a token for testing.

1.  **Algorithm**: Make sure the algorithm is set to `HS256`.
2.  **Payload**: The payload **must** contain a `role` claim. For these tests, use the `web_user` role. You can also add other claims that your application might use, like `username`.

    **Example Payload:**
    ```json
    {
      "role": "web_user",
      "username": "test_deployment_user",
      "exp": 1735689600
    }
    ```
    *(Note: `exp` is a standard expiration time claim, set as a Unix timestamp in the future.)*

3.  **Secret**: In the "Verify Signature" box, paste the secret from your `postgrest.conf` file. Make sure the "secret base64 encoded" checkbox is **not** checked.

4.  **Copy the Token**: Copy the resulting token (the long string in the "Encoded" box).

## Running the Scripts

Before running the scripts, set the following environment variables:

```bash
export API_BASE_URL="http://localhost:3000"
export JWT="your_copied_jwt_string_here"
```

Then, make the scripts executable and run them:
```bash
chmod +x *.sh
./01_check_views.sh
```

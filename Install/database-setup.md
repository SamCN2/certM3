# CertM3 Database Setup Guide

This guide explains how to set up the PostgreSQL database for CertM3, with a focus on secure, passwordless authentication methods.

## 1. Prerequisites

- PostgreSQL 14 or later
- Administrative access to the database server
- CertM3 source code (this repository)
- SSL certificates (for mTLS, if using remote DB)

## 2. Database Installation

**Ubuntu/Debian:**
```sh
sudo apt update
sudo apt install postgresql postgresql-contrib
```

**CentOS/RHEL:**
```sh
sudo dnf install postgresql-server postgresql-contrib
sudo postgresql-setup --initdb
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

## 3. Database Schema Setup

1. **Create the database and user:**
   ```sh
   sudo -u postgres psql
   CREATE DATABASE certm3;
   CREATE USER certm3_user;
   GRANT ALL PRIVILEGES ON DATABASE certm3 TO certm3_user;
   \q
   ```

2. **Apply the schema:**
   ```sh
   psql -U certm3_user -d certm3 -f scripts/create_certm3_schema.sql
   ```

## 4. Authentication Methods

### A. Unix Socket Authentication (Local, Recommended)

1. **Configure PostgreSQL for peer authentication:**
   Edit `pg_hba.conf` (location varies, e.g. `/etc/postgresql/14/main/pg_hba.conf`):
   ```
   local   certm3   certm3_user   peer
   ```
2. **Create a matching system user:**
   ```sh
   sudo useradd -r -s /bin/bash certm3_user
   ```
3. **Restart PostgreSQL:**
   ```sh
   sudo systemctl restart postgresql
   ```

### B. mTLS Authentication (Remote, Recommended)

1. **Generate CA, server, and client certificates:**
   ```sh
   # On the DB server:
   sudo mkdir -p /etc/postgresql/ssl
   cd /etc/postgresql/ssl

   # CA
   openssl genrsa -out ca.key 4096
   openssl req -new -x509 -days 3650 -key ca.key -out ca.crt -subj "/CN=CertM3-CA"

   # Server
   openssl genrsa -out server.key 2048
   openssl req -new -key server.key -out server.csr -subj "/CN=postgres-server"
   openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt -days 365

   # Client
   openssl genrsa -out client.key 2048
   openssl req -new -key client.key -out client.csr -subj "/CN=certm3_user"
   openssl x509 -req -in client.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out client.crt -days 365
   ```

2. **Configure PostgreSQL:**
   - In `postgresql.conf`:
     ```
     ssl = on
     ssl_cert_file = '/etc/postgresql/ssl/server.crt'
     ssl_key_file = '/etc/postgresql/ssl/server.key'
     ssl_ca_file = '/etc/postgresql/ssl/ca.crt'
     ```
   - In `pg_hba.conf`:
     ```
     hostssl certm3 certm3_user 0.0.0.0/0 cert clientcert=1
     ```
   - In `pg_ident.conf` (if needed for mapping):
     ```
     certm3-map certm3_user certm3_user
     ```

3. **Restart PostgreSQL:**
   ```sh
   sudo systemctl restart postgresql
   ```

4. **Client connection example:**
   ```sh
   psql "sslmode=verify-full sslrootcert=ca.crt sslcert=client.crt sslkey=client.key host=your-db-server-ip dbname=certm3 user=certm3_user"
   ```

## 5. Application Configuration

- For local (socket) connections, set in `src/api/src/datasources/postgres.datasource.ts`:
  ```js
  host: '/var/run/postgresql',
  ssl: false,
  ```
- For mTLS, set:
  ```js
  host: 'your-db-server-ip',
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/ca.crt'),
    key: fs.readFileSync('/path/to/client.key'),
    cert: fs.readFileSync('/path/to/client.crt')
  },
  ```

## 6. Security Considerations

- Never use passwords in production if you can use peer or mTLS authentication.
- Store private keys and certificates securely.
- Regularly rotate certificates and keys.
- Restrict DB access with firewalls and network policies.

## 7. Troubleshooting

- Check PostgreSQL logs for connection/authentication errors.
- Use `openssl s_client` to debug SSL connections.
- Ensure file permissions on keys/certs are correct.

---

For more details, see the official PostgreSQL documentation: https://www.postgresql.org/docs/current/

## Next Steps

After completing the database setup:

1. Configure the application environment variables
2. Test the database connection
3. Run application migrations if applicable
4. Set up monitoring and logging
5. Implement backup procedures
6. Document your specific configuration for your team

---

**Note:** This guide assumes a Linux environment. For Windows or macOS, some commands and paths may differ. Always refer to the official PostgreSQL documentation for your specific platform. 
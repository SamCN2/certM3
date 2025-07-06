# CertM3 Docker Container

This directory contains the Docker configuration for running CertM3 as an all-in-one production container.

## Overview

The CertM3 Docker container includes:
- **API Server**: Node.js/TypeScript backend API (packaged binary)
- **Middleware**: Go-based certificate management middleware (packaged binary)
- **Signer**: Go-based certificate signing service (packaged binary)
- **PostgreSQL**: Database for storing certificate metadata
- **Nginx**: Reverse proxy and web server
- **PM2**: Process manager for Node.js and Go services

## Prerequisites

**IMPORTANT**: CertM3 requires a proper FQDN (Fully Qualified Domain Name) to function correctly. The application will reject connections from localhost or IP addresses.

### Setting up FQDN

**DNS Configuration** (Required):
- Configure your DNS to point your domain to the server IP
- Example: `certm3.yourdomain.com` → `192.168.1.100`

## Quick Start

### Using Docker Compose (Recommended)

1. **Set your FQDN environment variable:**
   ```bash
   export CERTM3_FQDN=certm3.yourdomain.com
   ```

2. **Build and start the container:**
   ```bash
   docker-compose up -d
   ```

3. **View logs:**
   ```bash
   docker-compose logs -f
   ```

4. **Access the application:**
   - Web Interface: http://certm3.yourdomain.com
   - API Endpoint: http://certm3.yourdomain.com/api
   - Health Check: http://certm3.yourdomain.com/health

5. **Stop the container:**
   ```bash
   docker-compose down
   ```

### Using Docker directly

1. **Build the image:**
   ```bash
   docker build -t certm3:latest .
   ```

2. **Run the container:**
   ```bash
   docker run -d \
     --name certm3 \
     -p 80:80 \
     -p 443:443 \
     -e CERTM3_FQDN=certm3.yourdomain.com \
     -v certm3_ca:/var/spool/certM3 \
     -v certm3_db:/var/lib/postgresql/14/main \
     -v certm3_logs:/var/log/certM3 \
     certm3:latest
   ```

## Container Structure

```
/opt/certm3/                    # Application root (from pkg/)
├── bin/                        # Packaged binaries
│   ├── certm3-api              # Node.js API binary
│   ├── certm3-app              # Go middleware binary
│   └── certm3-signer           # Go signer binary
├── etc/                        # Configuration files
│   ├── certm3.pm2.config.js    # PM2 configuration
│   ├── config.default.yaml     # Default configuration
│   └── config.local.yaml       # Local overrides (if mounted)
├── static/                     # Web interface files
└── var/                        # Runtime data

/var/spool/certM3/              # CA certificates and keys
├── certs/                      # CA certificates
├── private/                    # Private keys
├── newcerts/                   # New certificates
└── crl/                        # Certificate revocation lists

/var/log/certM3/                # Application logs
/etc/certM3/                    # Configuration files
```

## Configuration

### Environment Variables

- `CERTM3_VERSION`: Version of CertM3 (default: 1.6.1)
- `CERTM3_FQDN`: **REQUIRED** - The FQDN for the application
- `POSTGRES_PASSWORD`: PostgreSQL password (default: certm3_password)

### Custom Configuration

To use custom configuration, mount a `config.local.yaml` file:

```bash
docker run -d \
  --name certm3 \
  -p 80:80 \
  -e CERTM3_FQDN=certm3.yourdomain.com \
  -v ./config.local.yaml:/opt/certm3/etc/config.local.yaml:ro \
  certm3:latest
```

## Data Persistence

The container uses Docker volumes to persist data:

- `certm3_ca`: CA certificates and private keys
- `certm3_db`: PostgreSQL database data
- `certm3_logs`: Application logs

### Backup and Restore

**Backup:**
```bash
# Backup CA data
docker run --rm -v certm3_ca:/data -v $(pwd):/backup alpine tar czf /backup/ca-backup.tar.gz -C /data .

# Backup database
docker exec certm3 pg_dump -U certm3 certm3 > certm3-db-backup.sql
```

**Restore:**
```bash
# Restore CA data
docker run --rm -v certm3_ca:/data -v $(pwd):/backup alpine tar xzf /backup/ca-backup.tar.gz -C /data

# Restore database
docker exec -i certm3 psql -U certm3 certm3 < certm3-db-backup.sql
```

## Troubleshooting

### FQDN Issues

If you see a 400 error with the message "This application requires a proper FQDN":

1. **Check your DNS configuration:**
   ```bash
   nslookup certm3.yourdomain.com
   ```

2. **Test with curl:**
   ```bash
   curl -H "Host: certm3.yourdomain.com" http://localhost
   ```

### View Service Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker exec certm3 pm2 logs

# Nginx logs
docker exec certm3 tail -f /var/log/nginx/certm3_error.log
```

### Access Container Shell

```bash
docker exec -it certm3 bash
```

### Check Service Status

```bash
docker exec certm3 pm2 status
```

### Restart Services

```bash
# Restart all services
docker exec certm3 pm2 restart all

# Restart specific service
docker exec certm3 pm2 restart api
```

### Common Issues

1. **FQDN not configured:**
   - Configure DNS to point your domain to the server
   - Ensure CERTM3_FQDN environment variable is set

2. **Port already in use:**
   - Check if port 80 or 443 is already in use
   - Change ports in docker-compose.yml

3. **Database connection issues:**
   - Check PostgreSQL logs: `docker exec certm3 tail -f /var/log/postgresql/postgresql-14-main.log`
   - Verify database setup: `docker exec certm3 psql -U certm3 -d certm3 -c "\dt"`

4. **CA certificate issues:**
   - Check CA files: `docker exec certm3 ls -la /var/spool/certM3/`
   - Regenerate CA: Remove volume and restart container

## Security Considerations

1. **FQDN requirement:** Ensures proper certificate validation and security
2. **Default passwords:** Change default PostgreSQL password in production
3. **CA security:** Ensure CA private keys are properly secured
4. **Network access:** Consider using Docker networks for internal communication
5. **SSL/TLS:** Configure proper SSL certificates for production use

## Production Deployment

For production deployment, consider:

1. **Using a reverse proxy** (e.g., Traefik, nginx-proxy) with SSL termination
2. **Setting up SSL certificates** with Let's Encrypt
3. **Configuring monitoring** and alerting
4. **Setting up automated backups**
5. **Using secrets management** for sensitive data
6. **Ensuring proper DNS configuration** for your FQDN

## Development

**Note:** This container is for production deployment only. For development:

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd certM3
   ```

2. **Follow development setup instructions** in the main README.md

3. **Use local development tools** and PM2 for development workflow 
# CertM3 Base URL Configuration Guide

This guide explains how to configure CertM3 to use a new base URL across all components. CertM3 is designed to use FQDNs (Fully Qualified Domain Names) even in development environments, treating all deployments as production-like for network configuration.

## Quick Start for Development

**For development, you can use CertM3 as-is without any configuration changes!** The default domain `urp.ogt11.com` resolves to `127.0.0.1` and `::1`, making it perfect for local development while still using proper FQDNs.

Simply add to your `/etc/hosts` file:
```
127.0.0.1 urp.ogt11.com
::1 urp.ogt11.com
```

This allows you to:
- Use HTTPS with proper certificates
- Test the full production-like setup
- Avoid localhost:port configurations
- Maintain consistent behavior across environments

## Overview

CertM3 uses FQDNs throughout its configuration to ensure:
- Consistent behavior between development and production
- Proper SSL/TLS certificate validation
- No reliance on localhost:port configurations
- Production-like network setup in all environments

## Quick Configuration

To change the base URL from the default `https://urp.ogt11.com` to your domain:

```bash
# 1. Configure base URL across all components
./scripts/configure-base-url.sh https://your-domain.com

# 2. Update SSL certificate paths (after obtaining certificates)
./scripts/update-ssl-paths.sh your-domain.com /path/to/cert.crt /path/to/key.key
```

## Detailed Process

### Step 1: Base URL Configuration

The `configure-base-url.sh` script updates all components:

**Configuration Files:**
- `src/mw/config.yaml` - Middleware configuration
- `src/mw/config.yaml.example` - Example configuration
- `src/mw/certM3.config` - Certificate configuration
- `ecosystem.config.js` - PM2 configuration

**Nginx Configuration:**
- `nginx/certm3.conf` - Web server configuration

**Source Code:**
- `src/api/src/controllers/request.controller.ts` - Email validation URLs

**Test Files:**
- All files in `tests/` directory
- API test files in `src/api/src/__tests__/`

**Documentation:**
- OpenAPI specifications in `docs/` and `src/mw/docs/`

**Deployment Scripts:**
- `scripts/deploy.sh` - Deployment verification

### Step 2: SSL Certificate Configuration

After obtaining SSL certificates for your domain:

```bash
./scripts/update-ssl-paths.sh your-domain.com /etc/ssl/certs/your-domain.com.crt /etc/ssl/private/your-domain.com.key
```

This script updates:
- Server name in nginx configuration
- SSL certificate paths
- SSL key paths

## Manual Configuration (Alternative)

If you prefer to configure manually, here are the key files to update:

### 1. Middleware Configuration

**`src/mw/config.yaml`:**
```yaml
frontend_baseurl: "https://your-domain.com/app"
backend_baseurl: "https://your-domain.com/api"
api_url: "https://your-domain.com"
```

### 2. Certificate Configuration

**`src/mw/certM3.config`:**
```bash
SIGNER_CRL_URL=http://your-domain.com/crl
SIGNER_AIA_URL=http://your-domain.com/aia
```

### 3. Nginx Configuration

**`nginx/certm3.conf`:**
```nginx
server_name your-domain.com;
ssl_certificate /path/to/your-domain.com.crt;
ssl_certificate_key /path/to/your-domain.com.key;
```

### 4. PM2 Configuration

**`ecosystem.config.js`:**
```javascript
API_URL: "https://your-domain.com/api"
```

## Verification

After configuration, verify the changes:

```bash
# Check all instances of your new domain
grep -r 'your-domain.com' . --exclude-dir=.git --exclude='*.bak.*'

# Test nginx configuration
nginx -t

# Verify SSL certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Run build verification
./scripts/verify-build.sh
```

## Backup and Rollback

The configuration scripts automatically create backup files with timestamps:

```bash
# List backup files
find . -name "*.bak.*"

# Restore from backup (example)
cp nginx/certm3.conf.bak.20241201_143022 nginx/certm3.conf
```

## DNS Configuration

Ensure your DNS is configured to point your domain to your server:

```bash
# Test DNS resolution
nslookup your-domain.com
dig your-domain.com

# Test connectivity
curl -I https://your-domain.com
```

## SSL Certificate Generation

For development, you can generate self-signed certificates:

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout your-domain.com.key -out your-domain.com.crt -days 365 -nodes -subj "/CN=your-domain.com"

# Move to standard locations
sudo mv your-domain.com.crt /etc/ssl/certs/
sudo mv your-domain.com.key /etc/ssl/private/
sudo chmod 644 /etc/ssl/certs/your-domain.com.crt
sudo chmod 600 /etc/ssl/private/your-domain.com.key
```

For production, use Let's Encrypt or your preferred CA:

```bash
# Using Let's Encrypt (certbot)
sudo certbot certonly --nginx -d your-domain.com
```

## Troubleshooting

### Common Issues

1. **Nginx configuration errors:**
   ```bash
   nginx -t
   sudo systemctl status nginx
   ```

2. **SSL certificate issues:**
   ```bash
   openssl x509 -in /path/to/cert.crt -text -noout
   ```

3. **DNS resolution problems:**
   ```bash
   dig your-domain.com
   nslookup your-domain.com
   ```

4. **Service connectivity:**
   ```bash
   curl -v https://your-domain.com/api/health
   curl -v https://your-domain.com/app/health
   ```

### Logs

Check relevant logs for issues:

```bash
# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# System logs
sudo journalctl -u nginx -f
sudo journalctl -u certm3-app -f
```

## Best Practices

1. **Always use FQDNs** - Never use localhost:port in configuration files
2. **Use HTTPS** - Always use HTTPS in production configurations
3. **Validate certificates** - Ensure SSL certificates are valid and properly configured
4. **Test thoroughly** - Verify all components work with the new configuration
5. **Keep backups** - Always maintain backup configurations
6. **Document changes** - Record configuration changes for your deployment

## Security Considerations

- Store SSL private keys securely with appropriate permissions (600)
- Use strong SSL/TLS configurations
- Regularly update SSL certificates
- Monitor certificate expiration dates
- Use proper DNS security (DNSSEC) in production

---

For additional help, see the [installation guide](../Install/README.md) and [production checklist](production-checklist.md). 
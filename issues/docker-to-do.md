# Docker Containerization for CertM3

## Issue Description

Containerize the CertM3 certificate management system as a single OCI container with internal nginx routing, designed to work behind external ingress controllers with TLS termination.

## Architecture Overview

### Container Design
- **Single OCI container** containing all services
- **Internal nginx** on port 8443 (HTTP with self-signed cert for security)
- **All routing logic** stays internal (`/`, `/certm3/`, `/api/`, `/app/`)
- **External ingress** handles SSL termination and proxies to container

### Service Layout
```
Container (port 8443):
├── nginx (reverse proxy, port 8443)
├── API service (port 3000, internal)
├── Middleware service (port 8080, internal) 
├── Signer service (internal)
├── SPA frontend (static files)
└── Admin interface (port 3002, internal)
```

### External Deployment
```
Internet → External Ingress (443/SSL) → Container (8443/HTTP)
                ↓
            Real FQDN certificates
            Simple proxy configuration
```

## Implementation Plan

### Phase 1: Container Foundation
- [ ] Create base Dockerfile using Ubuntu/Debian
- [ ] Install required packages (Node.js, Go, nginx, OpenSSL)
- [ ] Set up non-root user for security
- [ ] Create multi-stage build for Go binaries
- [ ] Create multi-stage build for Node.js API

### Phase 2: Service Integration
- [ ] Build API service in container
- [ ] Build middleware and signer binaries
- [ ] Build SPA frontend and copy to static directory
- [ ] Configure internal nginx for port 8443
- [ ] Remove SSL configuration from internal nginx
- [ ] Add self-signed certificate for internal security

### Phase 3: Container Orchestration
- [ ] Create supervisor/PM2 configuration for service management
- [ ] Add health check endpoints
- [ ] Configure logging to stdout/stderr
- [ ] Create entrypoint script
- [ ] Add environment variable configuration

### Phase 4: External Integration
- [ ] Document external nginx configuration
- [ ] Create example docker-compose.yml for development
- [ ] Document production deployment guide
- [ ] Add container registry configuration

## Technical Specifications

### Base Image
- **OS**: Ubuntu 22.04 LTS or Debian 12
- **Package Manager**: apt (familiar to team)
- **Security**: Non-root user, minimal attack surface

### Internal Services
- **API**: Node.js 18+ with LoopBack 4
- **Middleware**: Go 1.21+ binaries
- **Frontend**: Built SPA with esbuild
- **Nginx**: Internal reverse proxy on port 8443

### Certificate Strategy
- **Internal**: Self-signed certificate for container security
- **External**: Real FQDN certificates handled by external ingress
- **Optional**: Volume mount for external certificates (future enhancement)

### Port Configuration
- **Container exposes**: Port 8443 (HTTP)
- **Internal services**: 
  - API: localhost:3000
  - Middleware: localhost:8080
  - Admin: localhost:3002
  - Nginx: localhost:8443

## External Nginx Configuration

### Simple Proxy Setup
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL configuration (external certificates)
    ssl_certificate /etc/ssl/certs/your-domain.com.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.com.key;
    
    # Proxy everything to container
    location / {
        proxy_pass http://container-ip:8443;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Benefits
- ✅ No path rewriting needed
- ✅ All routing logic stays in container
- ✅ Simple external configuration
- ✅ Flexible and scalable

## Development Workflow

### Local Development
```bash
# Build container
docker build -t certm3 .

# Run with external nginx
docker run -p 8443:8443 certm3

# External nginx proxies localhost:443 → localhost:8443
```

### Production Deployment
```bash
# Deploy container
docker run -d -p 8443:8443 --name certm3 certm3

# Configure external ingress to proxy to container:8443
```

## Required Changes

### Nginx Configuration
- [ ] Change listen port from 443 to 8443
- [ ] Remove SSL certificate configuration
- [ ] Add self-signed certificate for internal security
- [ ] Keep all location blocks unchanged
- [ ] Update proxy_pass URLs to use internal ports

### Build System
- [ ] Create Dockerfile with multi-stage builds
- [ ] Update build scripts for container context
- [ ] Add container-specific environment variables
- [ ] Create .dockerignore file

### Service Management
- [ ] Replace PM2 with supervisor or systemd
- [ ] Add health check endpoints
- [ ] Configure proper logging
- [ ] Add graceful shutdown handling

### Configuration
- [ ] Convert hardcoded paths to environment variables
- [ ] Create configuration templates
- [ ] Add secrets management for sensitive data
- [ ] Support for different environments

## Success Criteria

- [ ] Single container runs all CertM3 services
- [ ] External nginx can proxy to container on port 8443
- [ ] All routing works correctly through external proxy
- [ ] Container is production-ready and secure
- [ ] Documentation covers deployment and configuration
- [ ] Development workflow is streamlined

## Future Enhancements

### Optional Certificate Mounting
- [ ] Volume mount for external certificates
- [ ] Runtime certificate generation
- [ ] Let's Encrypt integration
- [ ] Certificate renewal automation

### Advanced Features
- [ ] Container health monitoring
- [ ] Metrics collection
- [ ] Log aggregation
- [ ] Backup and restore procedures

## Notes

- Container should be immutable and stateless
- All configuration through environment variables
- Logs should go to stdout/stderr for container best practices
- Health checks required for production deployment
- Consider security scanning and vulnerability assessment
- Plan for horizontal scaling with session affinity

## Related Files

- `nginx/certm3.conf` - Current nginx configuration
- `ecosystem.config.js` - Current PM2 configuration
- `scripts/verify-build.sh` - Current build verification
- `src/api/` - API service
- `src/mw/` - Middleware service
- `src/web/` - Frontend SPA 
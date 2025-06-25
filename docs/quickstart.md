# CertM3 Quickstart Guide

## Overview
This guide provides a step-by-step checklist for deploying the complete CertM3 certificate management system. Each component must be installed and configured in the correct order for the system to function properly.

## Prerequisites
- **Operating System**: Linux (Ubuntu/Debian recommended)
- **User**: Root or sudo access required
- **Network**: Internet access for package installation
- **Domain**: FQDN configured (e.g., `urp.ogt11.com` for development)
- **SSL Certificate**: Self-signed or valid certificate for your domain

## Deployment Checklist

### 🔧 Step 1: Database Setup
**Component**: PostgreSQL Database
**Purpose**: Store certificate requests, user data, and audit logs

#### Tasks:
- [ ] Install PostgreSQL 12+ (`apt install postgresql postgresql-contrib`)
- [ ] Create database user and database
- [ ] Configure database connection settings
- [ ] Run database migrations
- [ ] Verify database connectivity
- [ ] Start and enable PostgreSQL service

#### Files to Configure:
- `src/api/database/typeorm.config.ts` - Database connection settings
- `src/api/migrations/` - Database schema migrations

#### Verification:
```bash
# Test database connection
psql -h localhost -U certm3 -d certm3_db -c "SELECT version();"
```

---

### 🌐 Step 2: Nginx Configuration
**Component**: Nginx Reverse Proxy
**Purpose**: SSL termination, routing, and static file serving

#### Tasks:
- [ ] Install Nginx (`apt install nginx`)
- [ ] Configure SSL certificates for your domain
- [ ] Set up reverse proxy configuration
- [ ] Configure static file serving for web SPA
- [ ] Set up proper routing rules
- [ ] Test SSL configuration
- [ ] Start and enable Nginx service

#### Files to Configure:
- `nginx/certm3.conf` - Main Nginx configuration
- SSL certificate files (self-signed or valid)
- `/etc/hosts` entry for development domain

#### Verification:
```bash
# Test Nginx configuration
nginx -t

# Test SSL endpoint
curl -k https://urp.ogt11.com/health
```

---

### 🔌 Step 3: Backend API
**Component**: Node.js/TypeScript API Server
**Purpose**: Certificate management, user management, database operations

#### Tasks:
- [ ] Install Node.js 18+ and npm
- [ ] Install project dependencies (`npm install`)
- [ ] Configure environment variables
- [ ] Set up database connection
- [ ] Run database migrations
- [ ] Build TypeScript code
- [ ] Start API server
- [ ] Verify API endpoints

#### Files to Configure:
- `src/api/config.ts` - API configuration
- `src/api/database/typeorm.config.ts` - Database settings
- Environment variables for database and JWT secrets

#### Verification:
```bash
# Test API health endpoint
curl https://urp.ogt11.com/api/health

# Test OpenAPI specification
curl https://urp.ogt11.com/api/openapi.json
```

---

### 🔄 Step 4: Middleware
**Component**: Go Middleware Service
**Purpose**: Frontend-backend communication, JWT handling, certificate signing

#### Tasks:
- [ ] Install Go 1.19+
- [ ] Build middleware binary (`go build`)
- [ ] Configure middleware settings
- [ ] Set up certificate signer socket permissions
- [ ] Configure backend API connection
- [ ] Start middleware service
- [ ] Verify middleware endpoints

#### Files to Configure:
- `src/mw/config.yaml` - Middleware configuration
- `/var/run/certm3/` - Certificate signer socket directory
- Systemd service file for auto-start

#### Verification:
```bash
# Test middleware health endpoint
curl https://urp.ogt11.com/app/health

# Test certificate request endpoint
curl -X POST https://urp.ogt11.com/app/initiate-request \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","displayName":"Test User"}'
```

---

### 🖥️ Step 5: Web SPA
**Component**: React/TypeScript Web Application
**Purpose**: User interface for certificate management

#### Tasks:
- [ ] Install Node.js dependencies (`npm install`)
- [ ] Configure API endpoints
- [ ] Build production bundle (`npm run build`)
- [ ] Deploy static files to Nginx directory
- [ ] Configure Nginx to serve SPA files
- [ ] Test web interface
- [ ] Verify all user flows

#### Files to Configure:
- `src/web/src/config.ts` - API endpoint configuration
- Build output directory for Nginx serving
- Nginx static file configuration

#### Verification:
```bash
# Test web interface
curl https://urp.ogt11.com/

# Verify static files are served
curl https://urp.ogt11.com/static/js/main.js
```

---

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │    │   Mobile App    │    │   API Client    │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │        Nginx Proxy        │
                    │   (SSL Termination)       │
                    └─────────────┬─────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
┌─────────▼─────────┐  ┌─────────▼─────────┐  ┌─────────▼─────────┐
│   Web SPA Files   │  │  Middleware API   │  │  Backend API      │
│   (Static Files)  │  │  (Go Service)     │  │  (Node.js/TS)     │
└───────────────────┘  └─────────┬─────────┘  └─────────┬─────────┘
                                 │                      │
                                 └──────────┬───────────┘
                                            │
                                 ┌─────────▼─────────┐
                                 │   PostgreSQL DB   │
                                 │   (Data Storage)  │
                                 └───────────────────┘
```

## Component Dependencies

### Startup Order
1. **Database** (PostgreSQL) - Required by Backend API
2. **Backend API** (Node.js) - Required by Middleware
3. **Middleware** (Go) - Required by Web SPA
4. **Nginx** - Can start anytime, but needs all services running
5. **Web SPA** - Depends on all APIs being available

### Configuration Dependencies
- **Backend API** needs database connection
- **Middleware** needs backend API URL
- **Web SPA** needs middleware API URL
- **Nginx** needs all service URLs and SSL certificates

## Common Issues and Solutions

### Database Connection Issues
- Verify PostgreSQL is running: `systemctl status postgresql`
- Check connection settings in `typeorm.config.ts`
- Ensure database user has proper permissions

### SSL Certificate Issues
- Verify certificate files exist and are readable
- Check Nginx SSL configuration
- Test with `openssl s_client -connect urp.ogt11.com:443`

### Socket Permission Issues
- Ensure `/var/run/certm3/` directory exists and has proper permissions
- Check that middleware service has access to socket directory
- Verify certificate signer service is running

### API Communication Issues
- Check all services are running: `systemctl status certm3-*`
- Verify API endpoints are accessible
- Check firewall settings and port configurations

## Verification Checklist

After completing all steps, verify:

### Database
- [ ] PostgreSQL service is running
- [ ] Database migrations completed successfully
- [ ] Connection test passes

### Backend API
- [ ] API service is running
- [ ] Health endpoint responds: `https://urp.ogt11.com/api/health`
- [ ] OpenAPI spec is accessible: `https://urp.ogt11.com/api/openapi.json`

### Middleware
- [ ] Middleware service is running
- [ ] Health endpoint responds: `https://urp.ogt11.com/app/health`
- [ ] Certificate request endpoint works

### Web Interface
- [ ] Web SPA loads in browser: `https://urp.ogt11.com/`
- [ ] All static files are served correctly
- [ ] User registration flow works
- [ ] Certificate request flow works

### SSL/TLS
- [ ] All endpoints use HTTPS
- [ ] SSL certificate is valid (or self-signed is trusted)
- [ ] No mixed content warnings

## Next Steps

After successful deployment:

1. **Security Hardening**: Review security configurations
2. **Monitoring Setup**: Configure logging and monitoring
3. **Backup Strategy**: Set up database backups
4. **Documentation**: Update system documentation
5. **Testing**: Perform comprehensive testing of all features

## Support

For issues and questions:
- Check the logs: `journalctl -u certm3-*`
- Review configuration files
- Consult the detailed documentation in `/docs/`
- Check GitHub issues for known problems 
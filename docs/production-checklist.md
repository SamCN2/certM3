# CertM3 Production Deployment Checklist

## Pre-Deployment Checks

### Environment Variables
- [ ] API_URL is set correctly
- [ ] CA_CERT_PATH is set and points to valid certificate
- [ ] CA_KEY_PATH is set and points to valid key
- [ ] NODE_ENV is set to 'production'
- [ ] Database connection string is configured
- [ ] Email service configuration is set

### SSL/TLS Configuration
- [ ] Valid SSL certificates are in place
- [ ] Certificate paths are correctly set in nginx config
- [ ] SSL protocols and ciphers are properly configured
- [ ] HSTS is properly configured
- [ ] SSL session caching is configured

### File System
- [ ] Log directory exists and has proper permissions
- [ ] Email spool directory exists and has proper permissions
- [ ] Static files directory exists and has proper permissions
- [ ] CA certificate and key files have proper permissions

### Database
- [ ] Database is properly configured
- [ ] Database user has correct permissions
- [ ] Database indexes are created
- [ ] Database backup is configured

## Deployment Steps

### 1. Code Preparation
- [ ] All code is committed
- [ ] No development-only code remains
- [ ] All console.log statements are removed
- [ ] Error handling is properly implemented
- [ ] Security headers are properly configured

### 2. Build Process
- [ ] Run `npm ci` to install dependencies
- [ ] Run `npm run build` for API
- [ ] Run `npm run build` and `npm run build:static` for App
- [ ] Verify all static files are present
- [ ] Run security audit (`npm audit`)

### 3. Process Management
- [ ] PM2 is installed
- [ ] PM2 startup script is configured
- [ ] Log rotation is configured
- [ ] Memory limits are set
- [ ] Process restart policies are configured

### 4. Nginx Configuration
- [ ] SSL configuration is correct
- [ ] Proxy settings are correct
- [ ] Static file serving is configured
- [ ] CORS headers are properly set
- [ ] Security headers are properly set
- [ ] Cache settings are appropriate

### 5. Monitoring
- [ ] Log monitoring is configured
- [ ] Error tracking is set up
- [ ] Performance monitoring is configured
- [ ] Alerting is configured

## Post-Deployment Verification

### 1. Application Health
- [ ] API is responding
- [ ] App is responding
- [ ] Static files are serving
- [ ] SSL is working
- [ ] Database connections are working

### 2. Security Verification
- [ ] SSL Labs test passes
- [ ] Security headers are present
- [ ] CORS is properly configured
- [ ] No sensitive data is exposed
- [ ] Rate limiting is working

### 3. Performance
- [ ] Static files are being cached
- [ ] API responses are timely
- [ ] Database queries are optimized
- [ ] Memory usage is within limits

### 4. Functionality
- [ ] Certificate request flow works
- [ ] Email validation works
- [ ] Certificate generation works
- [ ] Error handling works
- [ ] All API endpoints respond correctly

## Maintenance

### Regular Checks
- [ ] Log rotation is working
- [ ] Database backups are successful
- [ ] SSL certificates are not expiring soon
- [ ] Disk space is sufficient
- [ ] Memory usage is normal

### Update Procedures
- [ ] Backup procedure is documented
- [ ] Rollback procedure is documented
- [ ] Update procedure is documented
- [ ] Emergency contact list is available 
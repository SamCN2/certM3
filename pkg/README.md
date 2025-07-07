# CertM3 Package

This is a complete CertM3 package for deployment.

## Quick Start

1. **Run the setup script:**
   ```bash
   ./setup.sh
   ```

2. **Follow the setup instructions** to configure your domain and settings

3. **Start the services:**
   ```bash
   pm2 start etc/ecosystem.config.js
   ```

## Configuration

The setup script will guide you through configuration. You'll need to:

1. Copy `config-example.yaml` to `config.yaml`
2. Edit `config.yaml` with your actual domain and settings
3. Replace placeholder values like `your-domain.com` with your real domain

## Services

- **API**: Runs on port 3000 (internal)
- **Middleware**: Runs on port 8080 (internal)
- **Signer**: Unix socket communication

## Management

- **Check status:** `pm2 list`
- **View logs:** `pm2 logs`
- **Stop services:** `pm2 stop all`
- **Restart services:** `pm2 restart all`

## Production Setup

1. **Enable PM2 startup on boot:**
   ```bash
   pm2 startup
   pm2 save
   ```

2. **Set up database:**
   ```bash
   sudo -u postgres ./setup-database.sh
   ```

3. **Configure nginx** using `etc/nginx.certm3-skeleton.conf`

4. **Access the web interface** at your configured domain

## Files

- `config-example.yaml` - Example configuration (copy to `config.yaml`)
- `setup.sh` - Initial setup and configuration script
- `etc/ecosystem.config.js` - PM2 configuration
- `etc/nginx.certm3-skeleton.conf` - Nginx configuration template
- `setup-database.sh` - Database setup script
- `CA-mgmt/` - CA management scripts (generate your own CA) 

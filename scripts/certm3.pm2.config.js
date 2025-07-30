/**
 * PM2 ecosystem config for CertM3 (Production)
 * This is the source of truth for the packaged version
 */

module.exports = {
  apps: [{
    name: 'api',
    script: 'dist/index.js',
    args: '--config ../etc/config.yaml',
    cwd: 'api',
    watch: false,
    error_file: '/var/spool/certM3/logs/api-error.log',
    out_file: '/var/spool/certM3/logs/api-out.log',
    log_file: '/var/spool/certM3/logs/api-combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '1G',
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 5000,
    env: { 
      PORT: 3000,
      NODE_ENV: 'production'
    }
  },
  {
    name: 'certm3-app',
    script: 'bin/certm3-app',
    args: '--config etc/config.yaml',
    cwd: '.',
    watch: false,
    error_file: '/var/spool/certM3/logs/certm3-app-error.log',
    out_file: '/var/spool/certM3/logs/certm3-app-out.log',
    log_file: '/var/spool/certM3/logs/certm3-app-combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '1G',
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 5000,
    env: { 
      PORT: 8080,
      NODE_ENV: 'production'
    }
  },
  {
    name: 'certm3-signer',
    script: 'bin/certm3-signer',
    args: '--config etc/config.yaml',
    cwd: '.',
    watch: false,
    error_file: '/var/spool/certM3/logs/certm3-signer-error.log',
    out_file: '/var/spool/certM3/logs/certm3-signer-out.log',
    log_file: '/var/spool/certM3/logs/certm3-signer-combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '1G',
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 5000,
    env: { 
      NODE_ENV: 'production'
    }
  }],
}; 
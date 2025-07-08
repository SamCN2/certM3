/**
 * PM2 ecosystem config for CertM3 (Production)
 * This is the source of truth for the packaged version
 */
const path = require('path');

// Production config path
const configPath = path.resolve(__dirname, '../etc/config.yaml');

module.exports = {
  apps: [{
    name: 'api',
    script: '../api/dist/index.js',
    args: `--config ${configPath}`,
    cwd: path.resolve(__dirname, '..'),
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
  },
  {
    name: 'certm3-app',
    script: '../bin/certm3-app',
    args: `--config ${configPath}`,
    cwd: path.resolve(__dirname, '..'),
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
  },
  {
    name: 'certm3-signer',
    script: '../bin/certm3-signer',
    args: `--config ${configPath}`,
    cwd: path.resolve(__dirname, '..'),
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
  }],
}; 
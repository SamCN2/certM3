module.exports = {
  apps: [{
    name: 'api',
    script: 'src/api/dist/index.js',
    cwd: '.',
    watch: false,
    env: {
      NODE_ENV: 'development',
    },
    env_production: {
      NODE_ENV: 'production',
    },
    error_file: '/var/spool/certM3/logs/api-error.log',
    out_file: '/var/spool/certM3/logs/api-out.log',
    log_file: '/var/spool/certM3/logs/api-combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  },
  {
    name: 'app',
    script: 'npm',
    args: 'run dev',
    cwd: 'src/app',
    watch: false,
    error_file: '/var/spool/certM3/logs/app-error.log',
    out_file: '/var/spool/certM3/logs/app-out.log',
    log_file: '/var/spool/certM3/logs/app-combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  }],
}; 

module.exports = {
  apps: [{
    name: 'api',
    script: 'src/api/dist/index.js',
    cwd: '.',
    watch: false,
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
    args: 'run start', // Consider changing to 'npm run start' or similar for production builds
    cwd: 'src/app',
    watch: false,
    env: {
      NODE_ENV: "production", // Or development
      PORT: 3001,
      API_URL: "https://urp.ogt11.com/api", // Or your local API URL
      // --- Add CA Configuration ---
      CA_CERT_PATH: "/home/samcn2/src/certM3/CA/certs/ca-cert.pem",
      CA_KEY_PATH: "/home/samcn2/src/certM3/CA/private/ca-key.pem",
      // --- End CA Configuration ---
    },
    error_file: '/var/spool/certM3/logs/app-error.log',
    out_file: '/var/spool/certM3/logs/app-out.log',
    log_file: '/var/spool/certM3/logs/app-combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  }],
}; 

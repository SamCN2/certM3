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
    args: 'run dev', // Consider changing to 'npm run start' or similar for production builds
    cwd: 'src/app',
    watch: false,
    env: {
      NODE_ENV: "production", // Or development
      PORT: 3001,
      API_URL: "https://urp.ogt11.com/api", // Or your local API URL
      // --- Add CA Configuration ---
      CA_CERT_PATH: "/path/to/your/ca.crt.pem", // <-- REPLACE THIS PATH
      CA_KEY_PATH: "/path/to/your/ca.key.pem",   // <-- REPLACE THIS PATH
      // CA_KEY_PASSPHRASE: "your_ca_key_passphrase" // Uncomment and set if your key is encrypted
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

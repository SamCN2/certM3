import express, { Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import fs from 'fs';

const app = express();
// IMPORTANT: Do not change this port. If you get EADDRINUSE, find and kill the existing process instead.
const PORT = process.env.PORT || 3001;

// Validate required paths at startup
const validatePaths = () => {
  const paths = {
    // Static files
    static: path.join(__dirname, '../../../static'),
    staticJs: path.join(__dirname, '../../../static/js'),
    staticCss: path.join(__dirname, '../../../static/css'),
    staticAssets: path.join(__dirname, '../../../static/assets'),
    
    // Main HTML files
    index: path.join(__dirname, '../../../static/index.html'),
    request: path.join(__dirname, 'views/request.html'),
    validate: path.join(__dirname, 'views/validate.html'),
    
    // Critical JS files
    appJs: path.join(__dirname, '../../../static/js/app.js'),
    requestJs: path.join(__dirname, '../../../static/js/request.js'),
    validateJs: path.join(__dirname, '../../../static/js/validate.js'),
    
    // Log directories
    logs: '/var/spool/certM3/logs',
    testEmails: '/var/spool/certM3/test-emails'
  };

  const errors = [];
  for (const [name, filepath] of Object.entries(paths)) {
    try {
      fs.accessSync(filepath, fs.constants.R_OK);
      console.log(`✓ Found ${name} at ${filepath}`);
    } catch (err) {
      errors.push(`✗ ${name} not found at ${filepath}`);
    }
  }

  if (errors.length > 0) {
    console.error('\nStartup validation failed:');
    errors.forEach(err => console.error(err));
    process.exit(1);
  }
};

// Run validation before starting the server
validatePaths();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set proper MIME types
app.use((req: Request, res: Response, next) => {
  if (req.path.endsWith('.js')) {
    res.type('application/javascript');
  }
  next();
});

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).send('healthy\n');
});

// Serve static files from the static directory
app.use('/static', express.static(path.join(__dirname, '../../../static')));

// Serve the fallback home page at root
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../../../static/index.html'));
});

// Serve the request form for /app/request
app.get('/app/request', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'views/request.html'));
});

// Serve the validate page for /app/validate
app.get('/app/validate', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'views/validate.html'));
});

// Serve the main application for other /app/* routes
app.get('/app/*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../../../static/index.html'));
});

// Handle 404s for /app routes
app.use('/app/*', (req: Request, res: Response) => {
  res.status(404).sendFile(path.join(__dirname, '../../../static/index.html'));
});

app.listen(PORT, () => {
  console.log(`CertM3 Web App listening at http://localhost:${PORT}`);
  console.log(`Serving SPA at http://localhost:${PORT}/app`);
}); 
import express, { Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import fs from 'fs';
import { generateValidationToken, verifyValidationToken } from './utils/jwt';
import axios from 'axios';

// Validation functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
}

const app = express();
// IMPORTANT: Do not change this port. If you get EADDRINUSE, find and kill the existing process instead.
const PORT = process.env.PORT || 3001;

// API configuration
const API_BASE_URL = process.env.API_URL || 'https://urp.ogt11.com/api';

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
    certificate: path.join(__dirname, 'views/certificate.html'),
    
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

// Handle request submission
app.post('/app/request', async (req: Request, res: Response) => {
  const { username, email, displayName } = req.body;
  try {
    // 1. Validate input
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }
    if (!isValidUsername(username)) {
      return res.status(400).json({
        success: false,
        error: 'Username must be 3-20 characters and contain only letters, numbers, and underscores'
      });
    }

    // 2. Check if username is available
    try {
      await axios.get(`${API_BASE_URL}/request/check-username/${username}`);
      return res.status(400).json({
        success: false,
        error: 'Username is already taken'
      });
    } catch (error) {
      // 404 means username is available, which is what we want
      if (!axios.isAxiosError(error) || error.response?.status !== 404) {
        throw error;
      }
    }

    // 3. Create the request
    const requestResponse = await axios.post(`${API_BASE_URL}/requests`, {
      username,
      email,
      displayName
    });

    // 4. Return success response
    res.json({
      success: true,
      data: {
        requestId: requestResponse.data.id,
        message: 'Please check your email for validation instructions'
      }
    });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process request'
    });
  }
});

// Serve the validation page for validation links
app.get('/app/validate/:requestId/challenge-:challengeId', async (req: Request, res: Response) => {
  const { requestId, challengeId } = req.params;
  const fullChallenge = `challenge-${challengeId}`;

  try {
    console.log(`Validating request with ID: ${requestId} and challenge ID: ${fullChallenge}`);
    // Call the API to validate the request
    const response = await fetch(`https://urp.ogt11.com/api/requests/${requestId}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challenge: fullChallenge })
    });

    if (response.ok) {
      // Generate JWT token for user creation
      const token = generateValidationToken(requestId);
      
      // Return success with token for both browser and script use
      res.json({ 
        success: true, 
        token,
        redirect: `/app/cert-request?requestId=${requestId}&token=${token}`
      });
    } else {
      // Return error for both browser and script use
      res.status(400).json({ 
        success: false, 
        error: 'Invalid request or challenge' 
      });
    }
  } catch (error) {
    console.error('Error validating request:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal Server Error' 
    });
  }
});

// Serve the validate page for manual validation
app.get('/app/validate', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'views/validate.html'));
});

// Handle manual validation submission
app.post('/app/validate', async (req: Request, res: Response) => {
  const { requestId, challenge } = req.body;
  const fullChallenge = `challenge-${challenge}`;

  try {
    const response = await fetch(`https://urp.ogt11.com/api/requests/${requestId}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challenge: fullChallenge })
    });

    if (response.ok) {
      // Generate JWT token for user creation
      const token = generateValidationToken(requestId);
      
      // Return success with token for both browser and script use
      res.json({ 
        success: true, 
        token,
        redirect: `/app/cert-request?requestId=${requestId}&token=${token}`
      });
    } else {
      // Return error for both browser and script use
      res.status(400).json({ 
        success: false, 
        error: 'Invalid request or challenge' 
      });
    }
  } catch (error) {
    console.error('Error validating request:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal Server Error' 
    });
  }
});

// Serve the certificate request page for direct access
app.get('/app/cert-request', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'views/cert-request.html'));
});

// Handle validation
app.post('/app/validate', async (req: Request, res: Response) => {
  const { requestId, challenge } = req.body;
  const fullChallenge = `challenge-${challenge}`;

  try {
    // 1. Validate the request
    const response = await axios.post(
      `${API_BASE_URL}/requests/${requestId}/validate`,
      { challenge: fullChallenge }
    );

    if (response.status === 204) {
      // 2. Generate JWT token
      const token = generateValidationToken(requestId);
      
      // 3. Return success with token
      res.json({
        success: true,
        data: {
          token,
          redirect: `/app/certificate?requestId=${requestId}&token=${token}`
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid request or challenge'
      });
    }
  } catch (error) {
    console.error('Error validating request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate request'
    });
  }
});

// Serve the certificate page
app.get('/app/certificate', (req: Request, res: Response) => {
  const token = req.query.token as string;
  const requestId = req.query.requestId as string;

  if (!token || !requestId) {
    return res.status(400).send('Missing token or requestId');
  }

  try {
    // Verify the token before serving the page
    const decoded = verifyValidationToken(token);
    if (decoded.requestId !== requestId) {
      return res.status(401).send('Invalid token');
    }

    res.sendFile(path.join(__dirname, 'views/certificate.html'));
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(401).send('Invalid token');
  }
});

// Handle certificate signing
app.post('/app/cert-sign', async (req: Request, res: Response) => {
  const { requestId, csr, password } = req.body;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No token provided'
    });
  }

  try {
    // 1. Verify the token
    const decoded = verifyValidationToken(token);
    if (decoded.requestId !== requestId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    // 2. Get the request details
    const requestResponse = await axios.get(`${API_BASE_URL}/requests/${requestId}`);
    const request = requestResponse.data;

    // 3. Get user details to ensure they exist
    const userResponse = await axios.get(`${API_BASE_URL}/users?username=${request.username}`);
    if (!userResponse.data || userResponse.data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    const user = userResponse.data[0];

    // 4. Submit CSR for signing
    const certResponse = await axios.post(`${API_BASE_URL}/certificates`, {
      csr,
      userId: user.id,
      username: request.username,
      email: request.email,
      displayName: request.displayName,
      status: 'active'
    });

    // 5. Return the signed certificate
    res.json({
      success: true,
      data: {
        certificate: certResponse.data.certificate,
        privateKey: certResponse.data.privateKey,
        password: password // Return the password for PKCS#12 bundle creation
      }
    });

  } catch (error) {
    console.error('Error processing certificate signing:', error);
    if (axios.isAxiosError(error)) {
      res.status(error.response?.status || 500).json({
        success: false,
        error: error.response?.data?.message || 'Failed to sign certificate'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
});

// Ensure /app/check-username/:username always returns JSON
app.get('/app/check-username/:username', async (req: Request, res: Response) => {
  const username = req.params.username;
  try {
    // Call the API to check if the username exists
    await axios.get(`${API_BASE_URL}/request/check-username/${username}`);
    // If no error, username is taken
    res.json({
      success: true,
      available: false,
      username
    });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      // Username is available
      res.json({
        success: true,
        available: true,
        username
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to check username availability'
      });
    }
  }
});

// Serve the main application for other /app/* routes (GET only)
app.get('/app/*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../../../static/index.html'));
});

// Handle 404s for /app routes (GET only)
app.get('/app/*', (req: Request, res: Response) => {
  res.status(404).sendFile(path.join(__dirname, '../../../static/index.html'));
});

app.listen(PORT, () => {
  console.log(`CertM3 Web App listening at http://localhost:${PORT}`);
  console.log(`Serving SPA at http://localhost:${PORT}/app`);
}); 
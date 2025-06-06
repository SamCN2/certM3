import express, { Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import fs from 'fs';
import { generateValidationToken, verifyValidationToken } from './utils/jwt';
import axios from 'axios';
import forge from 'node-forge'; // <-- Add forge

// Validation functions
// FIXME: Comment out email validation to allow any email format for now
// function isValidEmail(email: string): boolean {
//   const emailRegex = /^[a-z0-9]+@[a-z0-9]+\.[a-z0-9\.]+$/;
//   return emailRegex.test(email);
// }

function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
}

// Create Express app
export const app = express();

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
    request: path.join(__dirname, '../../../static/views/request.html'),
    validate: path.join(__dirname, '../../../static/views/validate.html'),
    certificate: path.join(__dirname, '../../../static/views/certificate.html'),
    
    // Critical JS files
    requestJs: path.join(__dirname, '../../../static/js/request.js'),
    validateJs: path.join(__dirname, '../../../static/js/validate.js'),
    certificateViewJs: path.join(__dirname, '../../../static/js/views/certificate/view.js'),
    certificateCryptoJs: path.join(__dirname, '../../../static/js/views/certificate/crypto.js'),
    
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

// --- CA Configuration Loading ---
let caCertPem: string = '';
let caKeyPem: string = '';
const CA_CERT_PATH = process.env.CA_CERT_PATH;
const CA_KEY_PATH = process.env.CA_KEY_PATH;

if (!CA_CERT_PATH || !CA_KEY_PATH) {
  if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined) {
    console.warn('Skipping CA_CERT_PATH/CA_KEY_PATH check in test environment.');
    caCertPem = 'dummy';
    caKeyPem = 'dummy';
  } else {
    console.error('FATAL: CA_CERT_PATH and CA_KEY_PATH environment variables must be set.');
    process.exit(1);
  }
} else {
  try {
    caCertPem = fs.readFileSync(CA_CERT_PATH, 'utf8');
    caKeyPem = fs.readFileSync(CA_KEY_PATH, 'utf8');
    console.log('CA certificate and key loaded successfully from paths specified in environment variables.');
  } catch (err) {
    console.error('FATAL: Failed to load CA certificate or key from paths:', CA_CERT_PATH, CA_KEY_PATH, err);
    process.exit(1); // Exit if CA cannot be loaded
  }
}
// --- End CA Configuration Loading ---

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set proper MIME types
app.use((req: Request, res: Response, next) => {
  if (req.path.endsWith('.js')) {
    res.type('application/javascript');
  } else if (req.path.endsWith('.css')) {
    res.type('text/css');
  } else if (req.path.endsWith('.woff2')) {
    res.type('font/woff2');
  } else if (req.path.endsWith('.woff')) {
    res.type('font/woff');
  } else if (req.path.endsWith('.ttf')) {
    res.type('font/ttf');
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
  const filePath = path.join(__dirname, '../../../static/views/request.html');
  console.log('Current directory:', __dirname);
  console.log('Resolved file path:', filePath);
  console.log('File exists:', fs.existsSync(filePath));
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error serving request.html:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to serve request form'
      });
    }
  });
});

// Serve the validation page for /app/validate
app.get('/app/validate', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../../../static/views/validate.html'));
});

// Serve the validation page for a specific request
app.get('/app/validate/:requestId', async (req: Request, res: Response) => {
  const { requestId } = req.params;
  try {
    // Check request status and expiry
    const { status, expiry, isExpired } = await getRequestStatus(requestId);
    
    // If request is expired, return error
    if (isExpired) {
      return res.status(400).json({
        success: false,
        error: {
          statusCode: 400,
          name: 'ValidationError',
          message: 'Request has expired'
        }
      });
    }

    // Serve the validation page
    res.sendFile(path.join(__dirname, '../../../static/views/validate.html'));
  } catch (error) {
    console.error('Error serving validation page:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to serve validation page'
    });
  }
});

// Handle request submission
app.post('/app/request', async (req: Request, res: Response) => {
  const { username, email, displayName } = req.body;
  try {
    // 1. Validate input
    // FIXME: Comment out email validation to allow any email format for now
    // if (!isValidEmail(email)) {
    //   return res.status(400).json({
    //     success: false,
    //     error: 'Invalid email format'
    //   });
    // }
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
    console.log('Sending request data:', { username, email, displayName });
    const requestResponse = await axios.post(`${API_BASE_URL}/requests`, {
      username,
      email,
      displayName
    });

    // 4. Return success response
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Accept', 'application/json');
    res.json({
      success: true,
      data: {
        requestId: requestResponse.data.id,
        message: 'Please check your email for validation instructions',
        redirect: `/app/validate/${requestResponse.data.id}`
      }
    });
  } catch (error) {
    console.error('Error processing request:', error);
    if (axios.isAxiosError(error)) {
        console.error('API Error Response:', {
            status: error.response?.status,
            data: error.response?.data,
            headers: error.response?.headers
        });
    }
    res.status(500).json({
        success: false,
        error: 'Failed to process request'
    });
  }
});

// Helper to get request status and check expiry
export async function getRequestStatus(requestId: string): Promise<{ status: string | null; expiry: Date | null; isExpired: boolean }> {
  try {
    console.log(`Fetching status for request ${requestId}`);
    const response = await axios.get(`${API_BASE_URL}/requests/${requestId}`);
    console.log('API Response:', JSON.stringify(response.data));
    
    if (!response.data) {
      console.error('Empty response data from API');
      return { status: null, expiry: null, isExpired: true };
    }

    const status = response.data.status;
    const createdAt = response.data.createdAt;

    if (!status) {
      console.error('No status field in API response:', response.data);
      return { status: null, expiry: null, isExpired: true };
    }

    if (!createdAt) {
      console.error('No createdAt field in API response:', response.data);
      return { status, expiry: null, isExpired: true };
    }

    try {
      const createdDate = new Date(createdAt);
      const now = new Date();
      
      // For initial validation (status !== 'approved'), check 24h expiry
      if (status !== 'approved') {
        const initialExpiry = new Date(createdDate);
        initialExpiry.setHours(initialExpiry.getHours() + 24);
        return { 
          status, 
          expiry: initialExpiry,
          isExpired: now > initialExpiry
        };
      }
      
      // For re-validation (status === 'approved'), check 10m expiry
      const revalidationExpiry = new Date(createdDate);
      revalidationExpiry.setMinutes(revalidationExpiry.getMinutes() + 10);
      return { 
        status, 
        expiry: revalidationExpiry,
        isExpired: now > revalidationExpiry
      };
    } catch (dateError) {
      console.error('Error parsing createdAt date:', dateError);
      return { status, expiry: null, isExpired: true };
    }
  } catch (error) {
    console.error('Error fetching request status:', error);
    if (axios.isAxiosError(error)) {
      console.error('API Error Response:', {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers
      });
    }
    return { status: null, expiry: null, isExpired: true };
  }
}

// Serve the validation page for validation links
// NOTE: This route is used when a user clicks the validation link in their email.
// For browser flows, we must redirect to the certificate page after successful validation.
// For API/AJAX, you may want to return JSON, but for this flow, a redirect is correct UX.
app.get('/app/validate/:requestId/:challenge', async (req: Request, res: Response) => {
  const { requestId, challenge } = req.params;

  try {
    // Check request status and expiry
    const { status, expiry, isExpired } = await getRequestStatus(requestId);
    
    // If request is expired, return error
    if (isExpired) {
      return res.status(400).json({
        success: false,
        error: {
          statusCode: 400,
          name: 'ValidationError',
          message: 'Request has expired'
        }
      });
    }

    // If already validated, redirect to certificate page
    if (status === 'approved') {
      const token = generateValidationToken(requestId);
      return res.redirect(`/app/certificate?requestId=${requestId}&token=${token}`);
    }

    // Validate the challenge
    console.log(`Validating request with ID: ${requestId} and challenge: ${challenge}`);
    const response = await axios.post(`${API_BASE_URL}/requests/${requestId}/validate`, {
      challenge
    });

    if (response.status === 204) {
      // Get the username from the request
      const requestResponse = await axios.get(`${API_BASE_URL}/requests/${requestId}`);
      const username = requestResponse.data.username;

      // Add user to default group
      try {
        await axios.post(`${API_BASE_URL}/users/${username}/groups`, {
          groups: ['users']
        });
        console.log(`Added user ${username} to default 'users' group`);
      } catch (error: any) {
        // Enhanced error logging for admin review
        console.error('GROUP_ASSIGNMENT_ERROR:', {
          timestamp: new Date().toISOString(),
          username,
          requestId,
          error: error.response?.data || error.message,
          status: error.response?.status,
          action: 'add_to_users_group'
        });
        // Continue even if adding to group fails - the user is still created
      }

      const token = generateValidationToken(requestId);
      // Redirect to certificate page (browser flow)
      return res.redirect(`/app/certificate?requestId=${requestId}&token=${token}`);
    } else {
      // Return error for both browser and script use
      return res.status(400).json({ 
        success: false, 
        error: {
          statusCode: 400,
          name: 'ValidationError',
          message: 'Invalid request or challenge'
        }
      });
    }
  } catch (error) {
    console.error('Error validating request:', error);
    return res.status(500).json({
      success: false,
      error: {
        statusCode: 500,
        name: 'InternalServerError',
        message: 'Internal Server Error'
      }
    });
  }
});

// Handle validation submission (both manual and direct)
app.post('/app/validate', async (req: Request, res: Response) => {
  const { requestId, challenge } = req.body;

  try {
    // Check request status and expiry
    const { status, expiry, isExpired } = await getRequestStatus(requestId);
    
    // If request is expired, return error
    if (isExpired) {
      return res.status(400).json({
        success: false,
        error: {
          statusCode: 400,
          name: 'ValidationError',
          message: 'Request has expired'
        }
      });
    }

    // If already validated, return success with token
    if (status === 'approved') {
      const token = generateValidationToken(requestId);
      return res.json({
        success: true,
        data: {
          token,
          redirect: `/app/certificate?requestId=${requestId}&token=${token}`
        }
      });
    }

    console.log(`Validating request with ID: ${requestId} and challenge: ${challenge}`);
    const response = await axios.post(
      `${API_BASE_URL}/requests/${requestId}/validate`,
      { challenge }
    );

    if (response.status === 204) {
      // Get the username from the request
      const requestResponse = await axios.get(`${API_BASE_URL}/requests/${requestId}`);
      const username = requestResponse.data.username;

      // Add user to default group
      try {
        await axios.post(`${API_BASE_URL}/users/${username}/groups`, {
          groups: ['users']
        });
        console.log(`Added user ${username} to default 'users' group`);
      } catch (error: any) {
        // Enhanced error logging for admin review
        console.error('GROUP_ASSIGNMENT_ERROR:', {
          timestamp: new Date().toISOString(),
          username,
          requestId,
          error: error.response?.data || error.message,
          status: error.response?.status,
          action: 'add_to_users_group'
        });
        // Continue even if adding to group fails - the user is still created
      }

      const token = generateValidationToken(requestId);
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
        error: {
          statusCode: 400,
          name: 'ValidationError',
          message: 'Invalid request or challenge'
        }
      });
    }
  } catch (error) {
    console.error('Error validating request:', error);
    res.status(500).json({
      success: false,
      error: {
        statusCode: 500,
        name: 'InternalServerError',
        message: 'Failed to validate request'
      }
    });
  }
});

// Serve the certificate request page for direct access
// app.get('/app/cert-request', (req: Request, res: Response) => {
//   res.sendFile(path.join(__dirname, '../../../static/views/cert-request.html'));
// });

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

    res.sendFile(path.join(__dirname, '../../../static/views/certificate.html'));
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(401).send('Invalid token');
  }
});

// Handle certificate generation
app.post('/app/certificate', async (req: Request, res: Response) => {
  const { csr, groupId, token, requestId } = req.body;

  if (!csr || !groupId || !token || !requestId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields'
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

    // 2. Parse and sign the CSR
    let parsedCsr;
    try {
      parsedCsr = forge.pki.certificationRequestFromPem(csr);
    } catch (e: any) {
      console.error('Failed to parse CSR:', e);
      return res.status(400).json({ 
        success: false, 
        error: `Invalid CSR format: ${e.message}` 
      });
    }

    // 3. Load CA certificate and key
    let caCert: forge.pki.Certificate;
    let caKey: forge.pki.PrivateKey;
    try {
      caCert = forge.pki.certificateFromPem(caCertPem);
      caKey = forge.pki.privateKeyFromPem(caKeyPem);
    } catch (e: any) {
      console.error('Error loading CA certificate or key:', e);
      return res.status(500).json({
        success: false,
        error: `Failed to load CA certificate or key: ${e.message}`
      });
    }

    // 4. Create and sign the certificate
    const cert = forge.pki.createCertificate();
    cert.serialNumber = generateSerialNumber();
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

    cert.setSubject(parsedCsr.subject.attributes);
    cert.setIssuer(caCert.subject.attributes);
    if (!parsedCsr.publicKey) {
      return res.status(400).json({
        success: false,
        error: 'CSR does not contain a public key'
      });
    }
    cert.publicKey = parsedCsr.publicKey;

    // Add extensions including group membership
    const csrEmail = parsedCsr.subject.getField('E')?.value;
    const extensions: any[] = [
      { name: 'basicConstraints', cA: false },
      { name: 'keyUsage', keyCertSign: false, digitalSignature: true, nonRepudiation: true, keyEncipherment: true, dataEncipherment: true }
    ];
    if (csrEmail) {
      extensions.push({ name: 'subjectAltName', altNames: [{ type: 6, value: csrEmail }] });
    }
    cert.setExtensions(extensions);

    // Sign the certificate
    cert.sign(caKey, forge.md.sha256.create());
    const signedCertPem = forge.pki.certificateToPem(cert);

    // 5. Store certificate metadata in the API
    try {
      await axios.post(`${API_BASE_URL}/certificates`, {
        requestId,
        groupId,
        serialNumber: cert.serialNumber,
        notBefore: cert.validity.notBefore,
        notAfter: cert.validity.notAfter,
        subject: parsedCsr.subject.attributes,
        issuer: caCert.subject.attributes
      });
    } catch (error) {
      console.error('Error storing certificate metadata:', error);
      // Continue even if storage fails - the certificate is still valid
    }

    // 6. Return the signed certificate
    res.json({
      success: true,
      data: {
        certificate: signedCertPem,
        redirect: `/app/certificate/download?requestId=${requestId}&token=${token}`
      }
    });

  } catch (error: any) {
    console.error('Error processing certificate:', error);
    res.status(500).json({
      success: false,
      error: `Failed to process certificate: ${error.message || 'An unknown error occurred'}`
    });
  }
});

// Helper function to generate a serial number (example)
function generateSerialNumber(): string {
  // Generate a random serial number (hex string) - adjust length as needed
  return forge.util.bytesToHex(forge.random.getBytesSync(16));
}

// API Routes
app.get('/app/check-username/:username', async (req: Request, res: Response) => {
  console.log('Received check-username request:', {
    path: req.path,
    params: req.params,
    query: req.query,
    headers: req.headers
  });

  const username = req.params.username;

  // Validate username format first
  if (!isValidUsername(username)) {
    console.log('Invalid username format:', username);
    return res.status(400).json({
      success: false,
      error: 'Invalid username format',
      available: false,
      username
    });
  }

  try {
    console.log('Checking username availability:', username);
    // Call the API to check if the username exists (in users or requests)
    await axios.get(`${API_BASE_URL}/request/check-username/${username}`);
    // If no error, username is taken
    console.log('Username is taken:', username);
    res.json({
      success: true,
      available: false,
      username
    });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      // Username is available
      console.log('Username is available:', username);
      res.json({
        success: true,
        available: true,
        username
      });
    } else {
      console.error('Error checking username:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check username availability',
        available: false,
        username
      });
    }
  }
});

// Handle group lookup for certificate
app.get('/app/groups/:requestId', async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Missing authorization token'
    });
  }

  try {
    // 1. Get request details to find username
    const requestResponse = await axios.get(`${API_BASE_URL}/requests/${requestId}`);
    const username = requestResponse.data.username;

    // 2. Look up user by username
    const userResponse = await axios.get(`${API_BASE_URL}/users?filter[where][username]=${username}`);
    if (!userResponse.data || userResponse.data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found. Please complete validation first.'
      });
    }
    const userId = userResponse.data[0].id;

    // 3. Get user's groups
    const groupsResponse = await axios.get(`${API_BASE_URL}/users/${userId}/groups`);
    
    res.json({
      success: true,
      data: {
        groups: groupsResponse.data.map((g: any) => g.name)
      }
    });
  } catch (error) {
    console.error('Error fetching groups:', error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        return res.status(404).json({
          success: false,
          error: 'Request not found'
        });
      }
      console.error('API Error Response:', {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch groups'
    });
  }
});

app.get('/app/groups', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/groups`);
    const groups = response.data;
    // Always include the 'users' group
    if (!groups.some((g: { name: string; displayName: string; }) => g.name === 'users')) {
      groups.push({ name: 'users', displayName: 'Users' });
    }
    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch groups' });
  }
});

// Handle any unmatched routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      statusCode: 404,
      name: 'NotFoundError',
      message: 'Route not found'
    }
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: Function) => {
  console.error('Unhandled Error:', {
    error: err,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query
  });
  
  // Write to error log file
  const errorLogPath = '/var/spool/certM3/logs/app-error.log';
  const errorLog = `${new Date().toISOString()} - ${req.method} ${req.path}\nError: ${err.message}\nStack: ${err.stack}\nBody: ${JSON.stringify(req.body)}\nParams: ${JSON.stringify(req.params)}\nQuery: ${JSON.stringify(req.query)}\n\n`;
  
  try {
    fs.appendFileSync(errorLogPath, errorLog);
  } catch (writeError) {
    console.error('Failed to write to error log:', writeError);
  }

  res.status(500).json({
    success: false,
    error: {
      statusCode: 500,
      name: 'InternalServerError',
      message: err.message || 'Internal Server Error'
    }
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`CertM3 Web App listening at http://localhost:${PORT}`);
    console.log(`Serving SPA at http://localhost:${PORT}/app`);
  });
}

// Remove duplicate export
// export const app = express(); 

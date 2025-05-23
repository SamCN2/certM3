import express, { Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import fs from 'fs';
import { generateValidationToken, verifyValidationToken } from './utils/jwt';
import axios from 'axios';
import forge from 'node-forge'; // <-- Add forge

// IMPORTANT: Group Management Documentation
// ----------------------------------------
// The API has two different group-related endpoints:
// 1. /users/{userId}/groups - Gets groups for a specific user
//    - Used by /app/users/:username/groups to show user's groups
//    - Returns array of group names
// 2. /groups/{requestId} - Gets groups for a request
//    - Used by test-integration.ts for testing
//    - NOT used by the main application
//
// When adding users to groups:
// 1. Create group: POST /groups
// 2. Add members: POST /groups/{groupId}/members
//
// When getting user's groups:
// 1. Get user ID: GET /users?filter[where][username]=${username}
// 2. Get groups: GET /users/${userId}/groups
// ----------------------------------------

// doesn't work today, but close, and we're pushing without it
// // Group-related endpoints
// app.get('/app/groups/:requestId', async (req: Request, res: Response) => {
//   try {
//     const { requestId } = req.params;
//     const token = req.headers.authorization?.split(' ')[1];
//     if (!token) {
//       return res.status(401).json({
//         success: false,
//         error: 'Missing authorization token'
//       });
//     }

//     // Get user's groups from API
//     const response = await axios.get(`${API_BASE_URL}/groups/${requestId}`, {
//       headers: {
//         'Authorization': `Bearer ${token}`
//       }
//     });

//     res.json({
//       success: true,
//       data: response.data
//     });
//   } catch (error) {
//     console.error('Error getting groups:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to get groups'
//     });
//   }
// });

// doesn't work today, but close, and we're pushing without it
// app.post('/app/groups/:groupId/members', async (req: Request, res: Response) => {
//   try {
//     const { groupId } = req.params;
//     const { userId } = req.body;
//     const token = req.headers.authorization?.split(' ')[1];
//     if (!token) {
//       return res.status(401).json({
//         success: false,
//         error: 'Missing authorization token'
//       });
//     }

//     // Add user to group via API
//     const response = await axios.post(`${API_BASE_URL}/groups/${groupId}/members`, {
//       userId
//     }, {
//       headers: {
//         'Authorization': `Bearer ${token}`
//       }
//     });

//     res.json({
//       success: true,
//       data: response.data
//     });
//   } catch (error) {
//     console.error('Error adding user to group:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to add user to group'
//     });
//   }
// });

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
  res.setHeader('Content-Type', 'text/html');
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
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(path.join(__dirname, '../../../static/views/validate.html'));
  } catch (error) {
    console.error('Error serving validation page:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to serve validation page'
    });
  }
});

// Helper to get request status and check expiry
async function getRequestStatus(requestId: string): Promise<{ status: string | null; expiry: Date | null; isExpired: boolean }> {
  try {
    console.log(`Fetching status for request ${requestId}`);
    const response = await axios.get(`${API_BASE_URL}/request/${requestId}`);
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
    const requestResponse = await axios.post(`${API_BASE_URL}/request`, {
      username,
      email,
      displayName
    });

    // 4. Return success with redirect to validation page
    res.json({
      success: true,
      data: {
        redirect: `/app/validate/${requestResponse.data.id}`
      }
    });
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create request'
    });
  }
});

// Handle validation submission
app.post('/app/validate', async (req: Request, res: Response) => {
  const { requestId, challenge } = req.body;
  try {
    // 1. Validate the challenge
    const validateResponse = await axios.post(`${API_BASE_URL}/request/${requestId}/validate`, {
      challenge
    });

    // 2. Generate a token for the user
    const token = generateValidationToken(validateResponse.data.username, requestId);

    // 3. Return success with redirect to certificate page
    res.json({
      success: true,
      data: {
        token,
        redirect: `/app/certificate?token=${token}`
      }
    });
  } catch (error) {
    console.error('Error validating request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate request'
    });
  }
});

// Handle direct validation via URL
app.get('/app/validate/:requestId/:challenge', async (req: Request, res: Response) => {
  const { requestId, challenge } = req.params;
  try {
    // 1. Validate the challenge
    const validateResponse = await axios.post(`${API_BASE_URL}/request/${requestId}/validate`, {
      challenge
    });

    // 2. Generate a token for the user
    const token = generateValidationToken(validateResponse.data.username, requestId);

    // 3. Redirect to certificate page
    return res.redirect(`/app/certificate?token=${token}`);
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
  res.setHeader('Content-Type', 'text/html');
  res.sendFile(path.join(__dirname, '../../../static/views/certificate.html'));
});

// Handle certificate generation
app.post('/app/certificate', async (req: Request, res: Response) => {
  const { csr, token } = req.body;
  try {
    // 1. Verify the token
    const claims = verifyValidationToken(token);
    if (!claims) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // 2. Get the request ID from the token
    const requestId = claims.requestId;
    if (!requestId) {
      return res.status(400).json({
        success: false,
        error: 'Missing request ID in token'
      });
    }

    // 3. Sign the CSR
    const signResponse = await axios.post(`${API_BASE_URL}/certificates/sign`, {
      csr,
      requestId
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // 4. Return the signed certificate
    res.json({
      success: true,
      data: {
        certificate: signResponse.data.certificate
      }
    });
  } catch (error) {
    console.error('Error generating certificate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate certificate'
    });
  }
});

// Start the server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export the app for testing
export default app; 

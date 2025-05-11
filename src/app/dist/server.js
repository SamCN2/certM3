"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const fs_1 = __importDefault(require("fs"));
const app = (0, express_1.default)();
// IMPORTANT: Do not change this port. If you get EADDRINUSE, find and kill the existing process instead.
const PORT = process.env.PORT || 3001;
// Validate required paths at startup
const validatePaths = () => {
    const paths = {
        // Static files
        static: path_1.default.join(__dirname, '../../../static'),
        staticJs: path_1.default.join(__dirname, '../../../static/js'),
        staticCss: path_1.default.join(__dirname, '../../../static/css'),
        staticAssets: path_1.default.join(__dirname, '../../../static/assets'),
        // Main HTML files
        index: path_1.default.join(__dirname, '../../../static/index.html'),
        request: path_1.default.join(__dirname, 'views/request.html'),
        validate: path_1.default.join(__dirname, 'views/validate.html'),
        certRequest: path_1.default.join(__dirname, 'views/cert-request.html'),
        // Critical JS files
        appJs: path_1.default.join(__dirname, '../../../static/js/app.js'),
        requestJs: path_1.default.join(__dirname, '../../../static/js/request.js'),
        validateJs: path_1.default.join(__dirname, '../../../static/js/validate.js'),
        // Log directories
        logs: '/var/spool/certM3/logs',
        testEmails: '/var/spool/certM3/test-emails'
    };
    const errors = [];
    for (const [name, filepath] of Object.entries(paths)) {
        try {
            fs_1.default.accessSync(filepath, fs_1.default.constants.R_OK);
            console.log(`✓ Found ${name} at ${filepath}`);
        }
        catch (err) {
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
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Set proper MIME types
app.use((req, res, next) => {
    if (req.path.endsWith('.js')) {
        res.type('application/javascript');
    }
    next();
});
// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('healthy\n');
});
// Serve static files from the static directory
app.use('/static', express_1.default.static(path_1.default.join(__dirname, '../../../static')));
// Serve the fallback home page at root
app.get('/', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../../../static/index.html'));
});
// Serve the request form for /app/request
app.get('/app/request', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, 'views/request.html'));
});
// Serve the validation page for validation links
app.get('/app/validate/:requestId/challenge-:challengeId', async (req, res) => {
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
            // Redirect to the certificate request page if validation is successful
            res.redirect(`/app/cert-request?requestId=${requestId}&challengeId=${challengeId}`);
        }
        else {
            // Serve the validation page if validation fails
            res.sendFile(path_1.default.join(__dirname, 'views/validate.html'));
        }
    }
    catch (error) {
        console.error('Error validating request:', error);
        res.status(500).send('Internal Server Error');
    }
});
// Serve the validate page for manual validation
app.get('/app/validate', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, 'views/validate.html'));
});
// Serve the certificate request page for direct access
app.get('/app/cert-request', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, 'views/cert-request.html'));
});
// Serve the main application for other /app/* routes
app.get('/app/*', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../../../static/index.html'));
});
// Handle 404s for /app routes
app.use('/app/*', (req, res) => {
    res.status(404).sendFile(path_1.default.join(__dirname, '../../../static/index.html'));
});
app.listen(PORT, () => {
    console.log(`CertM3 Web App listening at http://localhost:${PORT}`);
    console.log(`Serving SPA at http://localhost:${PORT}/app`);
});

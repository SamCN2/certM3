"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
// IMPORTANT: Do not change this port. If you get EADDRINUSE, find and kill the existing process instead.
const PORT = process.env.PORT || 3001;
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
app.use('/static', express_1.default.static(path_1.default.join(__dirname, '../../static')));
// Serve the fallback home page at root
app.get('/', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../../static/index.html'));
});
// Serve the request form for /app/request
app.get('/app/request', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, 'views/request.html'));
});
// Serve the validate page for /app/validate
app.get('/app/validate', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, 'views/validate.html'));
});
// Serve the main application for other /app/* routes
app.get('/app/*', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../../static/index.html'));
});
// Handle 404s for /app routes
app.use('/app/*', (req, res) => {
    res.status(404).sendFile(path_1.default.join(__dirname, '../index.html'));
});
app.listen(PORT, () => {
    console.log(`CertM3 Web App listening at http://localhost:${PORT}`);
    console.log(`Serving SPA at http://localhost:${PORT}/app`);
});

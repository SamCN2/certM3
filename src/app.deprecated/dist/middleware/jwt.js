"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtMiddleware = jwtMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// In production, this should be in an environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'certm3-jwt-secret-key';
function jwtMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (payload.purpose !== 'user_creation') {
            throw new Error('Invalid token purpose');
        }
        req.user = payload;
        next();
    }
    catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}
//# sourceMappingURL=jwt.js.map
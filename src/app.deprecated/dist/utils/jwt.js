"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateValidationToken = generateValidationToken;
exports.verifyValidationToken = verifyValidationToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// In production, this should be in an environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'certm3-jwt-secret-key';
const TOKEN_EXPIRY = '5m'; // 5 minutes
function generateValidationToken(requestId, username, displayName) {
    return jsonwebtoken_1.default.sign({ requestId, username, displayName, purpose: 'user_creation' }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}
function verifyValidationToken(token) {
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (payload.purpose !== 'user_creation') {
            throw new Error('Invalid token purpose');
        }
        return payload;
    }
    catch (error) {
        throw new Error('Invalid or expired token');
    }
}
//# sourceMappingURL=jwt.js.map
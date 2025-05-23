import jwt from 'jsonwebtoken';

// In production, this should be in an environment variable
const JWT_SECRET = 'certm3-jwt-secret-key';
const TOKEN_EXPIRY = '5m'; // 5 minutes

export interface ValidationTokenPayload {
  requestId: string;
  purpose: 'user_creation';
}

export function generateValidationToken(requestId: string): string {
  const payload: ValidationTokenPayload = {
    requestId,
    purpose: 'user_creation'
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyValidationToken(token: string): ValidationTokenPayload {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as ValidationTokenPayload;
    if (payload.purpose !== 'user_creation') {
      throw new Error('Invalid token purpose');
    }
    return payload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
} 
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ValidationTokenPayload } from '../utils/jwt';

// In production, this should be in an environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'certm3-jwt-secret-key';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: ValidationTokenPayload;
    }
  }
}

export function jwtMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as ValidationTokenPayload;
    if (payload.purpose !== 'user_creation') {
      throw new Error('Invalid token purpose');
    }
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
} 
import { Request, Response, NextFunction } from 'express';
import { ValidationTokenPayload } from '../utils/jwt';
declare global {
    namespace Express {
        interface Request {
            user?: ValidationTokenPayload;
        }
    }
}
export declare function jwtMiddleware(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;

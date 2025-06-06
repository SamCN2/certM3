export interface ValidationTokenPayload {
    requestId: string;
    username: string;
    displayName?: string;
    purpose: 'user_creation';
}
export declare function generateValidationToken(requestId: string, username: string, displayName?: string): string;
export declare function verifyValidationToken(token: string): ValidationTokenPayload;

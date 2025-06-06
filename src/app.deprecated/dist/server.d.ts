export declare const app: import("express-serve-static-core").Express;
export declare function getRequestStatus(requestId: string): Promise<{
    status: string | null;
    expiry: Date | null;
    isExpired: boolean;
}>;

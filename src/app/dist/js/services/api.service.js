"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiService = void 0;
class ApiService {
    constructor() {
        this.baseUrl = 'http://urp.ogt11.com/api';
        // Constructor logic if needed
    }
    static getInstance() {
        if (!ApiService.instance) {
            ApiService.instance = new ApiService();
        }
        return ApiService.instance;
    }
    async createRequest(request) {
        try {
            const response = await fetch(`${this.baseUrl}/requests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });
            const data = await response.json();
            return {
                success: response.ok,
                data: response.ok ? data : undefined,
                error: response.ok ? undefined : data.message,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
    async validateUsername(username) {
        try {
            const response = await fetch(`${this.baseUrl}/validate/username`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username }),
            });
            const data = await response.json();
            return {
                success: response.ok,
                data: response.ok ? data : undefined,
                error: response.ok ? undefined : data.message,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
    async validateEmail(email) {
        try {
            const response = await fetch(`${this.baseUrl}/validate/email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });
            const data = await response.json();
            return {
                success: response.ok,
                data: response.ok ? data : undefined,
                error: response.ok ? undefined : data.message,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
    async generateCertificate(requestId) {
        try {
            const response = await fetch(`${this.baseUrl}/certificates/generate/${requestId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            return {
                success: response.ok,
                data: response.ok ? data : undefined,
                error: response.ok ? undefined : data.message,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
}
exports.ApiService = ApiService;

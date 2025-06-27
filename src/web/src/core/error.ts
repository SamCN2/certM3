export class AppError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly details?: any
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export class ValidationError extends AppError {
    constructor(message: string, details?: any) {
        super(message, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}

export class SecurityError extends AppError {
    constructor(message: string, details?: any) {
        super(message, 'SECURITY_ERROR', details);
        this.name = 'SecurityError';
    }
}

export class CryptoError extends AppError {
    constructor(message: string, details?: any) {
        super(message, 'CRYPTO_ERROR', details);
        this.name = 'CryptoError';
    }
}

export class ApiError extends AppError {
    constructor(message: string, details?: any) {
        super(message, 'API_ERROR', details);
        this.name = 'ApiError';
    }
}

class ErrorService {
    private static instance: ErrorService;
    private errorListeners: Array<(error: AppError) => void> = [];

    private constructor() {
        // Set up global error handler
        window.addEventListener('error', (event) => {
            this.handleError(new AppError(
                event.message,
                'RUNTIME_ERROR',
                { filename: event.filename, lineno: event.lineno, colno: event.colno }
            ));
        });

        // Set up unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(new AppError(
                event.reason?.message || 'Unhandled Promise Rejection',
                'PROMISE_ERROR',
                event.reason
            ));
        });
    }

    public static getInstance(): ErrorService {
        if (!ErrorService.instance) {
            ErrorService.instance = new ErrorService();
        }
        return ErrorService.instance;
    }

    public handleError(error: Error | AppError): void {
        // Convert regular Error to AppError if needed
        const appError = error instanceof AppError ? error : new AppError(
            error.message,
            'UNKNOWN_ERROR',
            { originalError: error }
        );

        // Log error
        console.error(`[${appError.code}] ${appError.message}`, appError.details);

        // Notify listeners
        this.errorListeners.forEach(listener => {
            try {
                listener(appError);
            } catch (listenerError) {
                console.error('Error in error listener:', listenerError);
            }
        });
    }

    public subscribe(listener: (error: AppError) => void): () => void {
        this.errorListeners.push(listener);
        return () => {
            this.errorListeners = this.errorListeners.filter(l => l !== listener);
        };
    }

    public createValidationError(message: string, details?: any): ValidationError {
        return new ValidationError(message, details);
    }

    public createSecurityError(message: string, details?: any): SecurityError {
        return new SecurityError(message, details);
    }

    public createCryptoError(message: string, details?: any): CryptoError {
        return new CryptoError(message, details);
    }

    public createApiError(message: string, details?: any): ApiError {
        return new ApiError(message, details);
    }
}

// Export singleton instance
export const errorService = ErrorService.getInstance(); 
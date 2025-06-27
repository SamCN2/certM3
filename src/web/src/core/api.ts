import axios, { AxiosError, AxiosInstance } from 'axios';
import { 
    InitialRequest, 
    ValidationRequest, 
    CsrRequest,
    RequestResponse,
    ValidationResponse,
    CertificateResponse,
    Group,
    ApiResponse
} from './types';
import config from '../../config.json';

class ApiService {
    private api: AxiosInstance;
    private static instance: ApiService;

    private constructor() {
        this.api = axios.create({
            baseURL: config.apiBaseUrl || '/app',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest' // CSRF protection
            }
        });

        // Add response interceptor for error handling
        this.api.interceptors.response.use(
            response => response,
            (error: AxiosError) => {
                if (error.response?.status === 401) {
                    // Handle unauthorized - clear state and redirect to initial
                    window.location.href = '/certm3/test.html';
                }
                return Promise.reject(this.handleError(error));
            }
        );
    }

    public static getInstance(): ApiService {
        if (!ApiService.instance) {
            ApiService.instance = new ApiService();
        }
        return ApiService.instance;
    }

    private handleError(error: AxiosError): Error {
        const errorData = error.response?.data as { error?: string } | undefined;
        if (errorData?.error) {
            return new Error(errorData.error);
        }
        if (error.response?.status === 401) {
            return new Error('Session expired. Please start over.');
        }
        if (error.response?.status === 403) {
            return new Error('Access denied. Please check your permissions.');
        }
        return new Error('An unexpected error occurred. Please try again.');
    }

    private async request<T>(endpoint: string, method: string, data?: any, headers?: any): Promise<T> {
        try {
            const response = await this.api.request<ApiResponse<T>>({
                method,
                url: endpoint,
                data,
                headers: {
                    ...headers
                }
            });

            if (!response.data.success) {
                throw new Error(response.data.error || 'Request failed');
            }

            return response.data.data as T;
        } catch (error) {
            throw this.handleError(error as AxiosError);
        }
    }

    public async submitInitialRequest(request: InitialRequest): Promise<RequestResponse> {
        return this.request<RequestResponse>('/initiate-request', 'POST', request);
    }

    public async validateEmail(request: ValidationRequest): Promise<ValidationResponse> {
        return this.request<ValidationResponse>('/validate-email', 'POST', request);
    }

    public async submitCsr(request: CsrRequest, jwt: string): Promise<CertificateResponse> {
        return this.request<CertificateResponse>('/submit-csr', 'POST', request, {
            'Authorization': `Bearer ${jwt}`
        });
    }

    public async checkUsername(username: string): Promise<boolean> {
        const response = await this.request<ApiResponse<boolean>>(`/check-username/${username}`, 'GET');
        return response.data || false;
    }

    public async getGroups(jwt: string): Promise<Group[]> {
        return this.request<Group[]>('/groups', 'GET', null, {
            'Authorization': `Bearer ${jwt}`
        });
    }
}

// Export singleton instance
export const apiService = ApiService.getInstance(); 
// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Request Types
export interface InitialRequest {
  username: string;
  email: string;
  displayName: string;
}

export interface ValidationRequest {
  requestId: string;
  challengeToken: string;
}

export interface CsrRequest {
  csr: string;
  groups: string[];
}

// Response Types
export interface RequestResponse {
  requestId: string;
}

export interface ValidationResponse {
  jwt: string;
}

export interface CertificateResponse {
  certificate: string;
}

// Group Types
export interface Group {
  id: string;
  name: string;
  description: string;
}

// State Types
export interface ValidationState {
  requestId?: string;
  error?: string;
}

export interface CertificateState {
  jwt?: string;
  availableGroups: Group[];
  selectedGroups: string[];
  certificate?: string;
  privateKey?: string;
  error?: string;
}

export interface AppState {
  validation: ValidationState;
  certificate: CertificateState;
  currentStep: 'initial' | 'validation' | 'csr' | 'certificate';
}

// Crypto Types
export interface KeyPair {
  privateKey: string;
  publicKey: string;
}

export interface CertificateData {
  privateKey: string;
  publicKey: string;
  csr: string;
} 
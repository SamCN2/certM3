/**
 * Copyright 2025 ogt11.com, llc
 */

export interface ApiConfig {
  api: {
    prefix: string;
    port: number;
    host: string;
  };
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  };
}

const development: ApiConfig = {
  api: {
    prefix: '/api',
    port: 3000,
    host: '127.0.0.1',
  },
  database: {
    host: 'localhost',
    port: 5432,
    database: 'certm3',
    username: 'postgres',
    password: 'postgres',
  },
};

const production: ApiConfig = {
  api: {
    prefix: '/api',
    port: 3000,
    host: '0.0.0.0',
  },
  database: {
    host: 'localhost',
    port: 5432,
    database: 'certm3',
    username: 'postgres',
    password: 'postgres',
  },
};

const configs: {[key: string]: ApiConfig} = {
  development,
  production,
};

// Get the environment from NODE_ENV, defaulting to development
const env = process.env.NODE_ENV || 'development';

// Export the configuration for the current environment
export const config = configs[env]; 
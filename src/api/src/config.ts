/**
 * Copyright 2025 ogt11.com, llc
 */

import {ConfigLoader} from './config-loader';

export interface ApiConfig {
  api: {
    prefix: string;
    port: number;
    host: string;
  };
  database: {
    host: string;
    database: string;
    username: string;
    password: string;
  };
}

// Default config - will be overridden by config loader
const defaultDevelopment: ApiConfig = {
  api: {
    prefix: '/api',
    port: 3000,
    host: '127.0.0.1',
  },
  database: {
    host: '/var/run/postgresql',
    database: 'certm3',
    username: 'samcn2',
    password: '',
  },
};

const defaultProduction: ApiConfig = {
  api: {
    prefix: '/api',
    port: 3000,
    host: '0.0.0.0',
  },
  database: {
    host: '/var/run/postgresql',
    database: 'certm3',
    username: 'samcn2',
    password: '',
  },
};

// Try to get config from config loader, fall back to defaults
function getConfig(): {development: ApiConfig, production: ApiConfig} {
  try {
    const configLoader = ConfigLoader.getInstance();
    const apiConfig = configLoader.getApiConfig();
    const dbConfig = configLoader.getDatabaseConfig();
    
    const development: ApiConfig = {
      api: {
        prefix: apiConfig.prefix,
        port: apiConfig.port,
        host: apiConfig.host,
      },
      database: {
        host: dbConfig.host,
        database: dbConfig.database,
        username: dbConfig.user,
        password: dbConfig.password,
      },
    };

    const production: ApiConfig = {
      api: {
        prefix: apiConfig.prefix,
        port: apiConfig.port,
        host: '0.0.0.0', // Production should bind to all interfaces
      },
      database: {
        host: dbConfig.host,
        database: dbConfig.database,
        username: dbConfig.user,
        password: dbConfig.password,
      },
    };

    return { development, production };
  } catch (error) {
    // Fall back to default config if config loader fails
    return { development: defaultDevelopment, production: defaultProduction };
  }
}

const configs: {[key: string]: ApiConfig} = getConfig();

// Get the environment from NODE_ENV, defaulting to development
const env = process.env.NODE_ENV || 'development';

// Export the configuration for the current environment
export const config = configs[env]; 
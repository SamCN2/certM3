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

// Try to get config from config loader, fail if not found
function getConfig(): {development: ApiConfig, production: ApiConfig} {
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
}

const configs: {[key: string]: ApiConfig} = getConfig();

// Get the environment from NODE_ENV, defaulting to development
const env = process.env.NODE_ENV || 'development';

// Export the configuration for the current environment
export const config = configs[env]; 
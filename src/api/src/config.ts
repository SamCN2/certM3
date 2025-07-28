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

// Single config source - no environment distinction
function getConfig(): ApiConfig {
  const configLoader = ConfigLoader.getInstance();
  const apiConfig = configLoader.getApiConfig();
  const dbConfig = configLoader.getDatabaseConfig();
  
  return {
    api: {
      prefix: apiConfig.prefix,
      port: apiConfig.port,
      host: apiConfig.host, // Use config value directly
    },
    database: {
      host: dbConfig.host,
      database: dbConfig.database,
      username: dbConfig.user,
      password: dbConfig.password,
    },
  };
}

export const config = getConfig(); 
/**
 * Copyright 2025 ogt11.com, llc
 */

import * as fs from 'fs';
import * as yaml from 'js-yaml';

export interface CertM3Config {
  database: {
    host: string;
    database: string;
    user: string;
    password: string;
    schema: string;
    ssl: boolean;
    transactionSupport: boolean;
    isolationLevel: string;
  };
  api: {
    port: number;
    host: string;
    prefix: string;
  };
  middleware: {
    socket_path: string;
  };
  app_server: {
    listen_addr: string;
    frontend_baseurl: string;
    backend_baseurl: string;
    jwt_secret: string;
    rate_limit_per_ip: number;
    metrics_enabled: boolean;
    metrics_path: string;
    metrics_timeout: string;
    test_email_dir: string;
  };
  signer: {
    ca_cert_path: string;
    ca_key_path: string;
    group_extension_oid: string;
    subject_ou: string;
    subject_o: string;
    subject_l: string;
    subject_st: string;
    subject_c: string;
    cert_validity_days: number;
    crl_distribution_url: string;
    aia_issuer_url: string;
    key_usage: string[];
    extended_key_usage: string[];
  };
  log_level: string;
  log_file: string;
  verbose: boolean;
}

export class ConfigLoader {
  private static instance: ConfigLoader;
  private config: CertM3Config | null = null;
  private configPath: string | null = null;

  private constructor() {}

  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  setConfigPath(path: string): void {
    this.configPath = path;
    // Clear cached config when path changes
    this.config = null;
  }

  loadConfig(): CertM3Config {
    if (this.config) {
      return this.config;
    }

    // Determine config file path
    const configPath = this.getConfigPath();
    
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }

    try {
      const configContent = fs.readFileSync(configPath, 'utf8');
      this.config = yaml.load(configContent) as CertM3Config;
      
      // Validate required fields
      this.validateConfig(this.config);
      
      return this.config;
    } catch (error) {
      throw new Error(`Failed to load config from ${configPath}: ${error}`);
    }
  }

  private getConfigPath(): string {
    // If explicitly set, use that
    if (this.configPath) {
      return this.configPath;
    }

    // Otherwise, search in common locations
    const searchPaths = [
      './config.yaml',
      '../config.yaml', 
      '../../config.yaml',
      './config/config.yaml',
      '../config/config.yaml',
      '../../config/config.yaml',
      './config/config.default.yaml',
      '../config/config.default.yaml',
      '../../config/config.default.yaml',
      './etc/config.yaml',
      '../etc/config.yaml',
      '../../etc/config.yaml',
      './etc/config.default.yaml',
      '../etc/config.default.yaml',
      '../../etc/config.default.yaml'
    ];

    for (const searchPath of searchPaths) {
      if (fs.existsSync(searchPath)) {
        return searchPath;
      }
    }

    throw new Error('No config file found. Set config path or ensure config.yaml exists in search paths');
  }

  private validateConfig(config: any): void {
    if (!config.database) {
      throw new Error('Database configuration is required');
    }
    
    if (!config.database.user) {
      throw new Error('Database user is required');
    }
    
    if (!config.database.database) {
      throw new Error('Database name is required');
    }

    if (!config.api) {
      throw new Error('API configuration is required');
    }
  }

  getDatabaseConfig() {
    const config = this.loadConfig();
    return config.database;
  }

  getApiConfig() {
    const config = this.loadConfig();
    return config.api;
  }

  getMiddlewareConfig() {
    const config = this.loadConfig();
    return config.middleware;
  }
} 
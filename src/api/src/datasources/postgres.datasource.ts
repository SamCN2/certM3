/**
 * Copyright 2025 ogt11.com, llc
 */

import {inject, lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import {juggler} from '@loopback/repository';
import {ConfigLoader} from '../config-loader';

// Default config - will be overridden by config loader
const defaultConfig = {
  name: 'postgres',
  connector: 'postgresql',
  host: '/var/run/postgresql',
  user: 'samcn2',
  database: 'certm3',
  schema: 'public',
  ssl: false,
  transactionSupport: true,
  isolationLevel: 'READ COMMITTED'
};

@lifeCycleObserver('datasource')
export class PostgresDataSource extends juggler.DataSource
  implements LifeCycleObserver {
  static dataSourceName = 'postgres';
  static readonly defaultConfig = defaultConfig;

  constructor(
    @inject('datasources.config.postgres', {optional: true})
    dsConfig: object = defaultConfig,
  ) {
    // Try to get config from config loader, fall back to injected config
    try {
      const configLoader = ConfigLoader.getInstance();
      const dbConfig = configLoader.getDatabaseConfig();
      
      const config = {
        name: 'postgres',
        connector: 'postgresql',
        host: dbConfig.host,
        user: dbConfig.user,
        database: dbConfig.database,
        schema: dbConfig.schema,
        ssl: dbConfig.ssl,
        transactionSupport: dbConfig.transactionSupport,
        isolationLevel: dbConfig.isolationLevel
      };
      
      super(config);
    } catch (error) {
      // Fall back to injected config if config loader fails
      super(dsConfig);
    }
  }
} 
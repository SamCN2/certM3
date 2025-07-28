/**
 * Copyright 2025 ogt11.com, llc
 */

import {lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import {juggler} from '@loopback/repository';
import {ConfigLoader} from '../config-loader';

// Default config - will be overridden by config loader
const defaultConfig = {
  name: 'postgres',
  connector: 'postgresql',
  host: '/var/run/postgresql',
  user: 'certm3',
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

  constructor() {
    // Get config from config loader
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
  }
} 
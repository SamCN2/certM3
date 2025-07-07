/**
 * Copyright 2025 ogt11.com, llc
 */

import {lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import {juggler} from '@loopback/repository';
import {ConfigLoader} from '../config-loader';

// Default config - will be overridden by config loader
const defaultConfig = {
  name: 'certm3',
  connector: 'postgresql',
  url: '',
  host: '/var/run/postgresql',
  user: 'certm3_user',
  password: '',
  database: 'certm3',
};

// Observe application's life cycle to disconnect the datasource when
// application is stopped. This allows the application to be shut down
// gracefully. The `stop()` method is inherited from `juggler.DataSource`.
// Learn more at https://loopback.io/doc/en/lb4/Life-cycle.html
@lifeCycleObserver('datasource')
export class UseradminDataSource
  extends juggler.DataSource
  implements LifeCycleObserver
{
  static dataSourceName = 'certm3';
  static readonly defaultConfig = defaultConfig;

  constructor() {
    // Get config from config loader
    const configLoader = ConfigLoader.getInstance();
    const dbConfig = configLoader.getDatabaseConfig();
    
    const config = {
      name: 'certm3',
      connector: 'postgresql',
      url: '',
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
    };
    
    super(config);
  }
}

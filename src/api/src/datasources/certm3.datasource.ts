/**
 * Copyright 2025 ogt11.com, llc
 */

import {inject, lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import {juggler} from '@loopback/repository';

const config = {
  name: 'certm3',
  connector: 'postgresql',
  url: '',
  host: '/var/run/postgresql',
  port: 5432,
  user: 'samcn2',
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
  static readonly defaultConfig = config;

  constructor(
    @inject('datasources.config.certm3', {optional: true})
    dsConfig: object = config,
  ) {
    super(dsConfig);
  }
}

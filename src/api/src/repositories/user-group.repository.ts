/**
 * Copyright 2025 ogt11.com, llc
 */

import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {PostgresDataSource} from '../datasources';
import {UserGroup} from '../models';

export class UserGroupRepository extends DefaultCrudRepository<
  UserGroup,
  typeof UserGroup.prototype.userId
> {
  constructor(
    @inject('datasources.postgres') dataSource: PostgresDataSource,
  ) {
    super(UserGroup, dataSource);
  }
} 
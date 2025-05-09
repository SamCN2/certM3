/**
 * Copyright 2025 ogt11.com, llc
 */

import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {PostgresDataSource} from '../datasources';
import {Users, UsersRelations} from '../models';
import {HttpErrors} from '@loopback/rest';

export class UserRepository extends DefaultCrudRepository<
  Users,
  typeof Users.prototype.id,
  UsersRelations
> {
  constructor(
    @inject('datasources.postgres') dataSource: PostgresDataSource,
  ) {
    super(Users, dataSource);
  }

  async create(entity: Omit<Users, 'id'>): Promise<Users> {
    try {
      return await super.create(entity);
    } catch (error) {
      // Check if this is a PostgreSQL error
      if (error.code === '23505') { // PostgreSQL unique violation error code
        const message = error.detail || error.message;
        if (message.includes('username')) {
          throw new HttpErrors.Conflict('Username already exists');
        } else if (message.includes('email')) {
          throw new HttpErrors.Conflict('Email already exists');
        }
      }
      throw error;
    }
  }
}
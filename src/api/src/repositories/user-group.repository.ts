/**
 * Copyright 2025 ogt11.com, llc
 */

import {inject, Getter} from '@loopback/core';
import {DefaultCrudRepository, BelongsToAccessor, repository} from '@loopback/repository';
import {PostgresDataSource} from '../datasources';
import {UserGroup, UserGroupRelations, Users, Group} from '../models';
import {UserRepository} from './user.repository';
import {GroupRepository} from './group.repository';

export class UserGroupRepository extends DefaultCrudRepository<
  UserGroup,
  typeof UserGroup.prototype.userId,
  UserGroupRelations
> {
  public readonly user: BelongsToAccessor<
    Users,
    typeof UserGroup.prototype.userId
  >;

  public readonly group: BelongsToAccessor<
    Group,
    typeof UserGroup.prototype.groupName
  >;

  constructor(
    @inject('datasources.postgres') dataSource: PostgresDataSource,
    @repository.getter('UserRepository')
    protected usersRepositoryGetter: Getter<UserRepository>,
    @repository.getter('GroupRepository')
    protected groupRepositoryGetter: Getter<GroupRepository>,
  ) {
    super(UserGroup, dataSource);
    this.user = this.createBelongsToAccessorFor(
      'user',
      usersRepositoryGetter,
    );
    this.registerInclusionResolver('user', this.user.inclusionResolver);

    this.group = this.createBelongsToAccessorFor(
      'group',
      groupRepositoryGetter,
    );
    this.registerInclusionResolver('group', this.group.inclusionResolver);
  }
} 
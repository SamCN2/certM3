/**
 * Copyright 2025 ogt11.com, llc
 */

import {Entity, model, property} from '@loopback/repository';

@model({
  name: 'user_groups',
  settings: {
    postgresql: {
      schema: 'public',
      table: 'user_groups',
    },
    indexes: {
      idx_user_groups_user_id: {
        keys: {
          user_id: 1,
        },
      },
      idx_user_groups_group_name: {
        keys: {
          group_name: 1,
        },
      },
    },
  },
})
export class UserGroup extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: false,
    useDefaultIdType: false,
    postgresql: {
      dataType: 'uuid',
      columnName: 'user_id',
    },
  })
  userId!: string;

  @property({
    type: 'string',
    id: true,
    generated: false,
    postgresql: {
      columnName: 'group_name',
      dataType: 'varchar',
      dataLength: 255,
    },
  })
  groupName!: string;

  @property({
    type: 'date',
    required: true,
    postgresql: {
      columnName: 'created_at',
      dataType: 'timestamp with time zone',
    },
  })
  createdAt!: Date;

  @property({
    type: 'string',
    postgresql: {
      columnName: 'created_by',
      dataType: 'varchar',
      dataLength: 255,
    },
  })
  createdBy?: string;

  @property({
    type: 'date',
    required: true,
    postgresql: {
      columnName: 'updated_at',
      dataType: 'timestamp with time zone',
    },
  })
  updatedAt!: Date;

  @property({
    type: 'string',
    postgresql: {
      columnName: 'updated_by',
      dataType: 'varchar',
      dataLength: 255,
    },
  })
  updatedBy?: string;

  constructor(data?: Partial<UserGroup>) {
    super(data);
  }
} 
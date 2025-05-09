/**
 * Copyright 2025 ogt11.com, llc
 */

import {Entity, model, property} from '@loopback/repository';

@model({
  name: 'groups',
  settings: {
    postgresql: {
      schema: 'public',
      table: 'groups',
    },
    indexes: {
      idx_groups_name: {
        keys: {
          name: 1,
        },
        options: {
          unique: true,
        },
      },
      idx_groups_status: {
        keys: {
          status: 1,
        },
      },
    },
  },
})
export class Group extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: false,
    required: true,
    postgresql: {
      columnName: 'name',
      dataType: 'varchar',
      dataLength: 255,
    },
  })
  name!: string;

  @property({
    type: 'string',
    required: true,
    postgresql: {
      columnName: 'display_name',
      dataType: 'varchar',
      dataLength: 255,
    },
  })
  displayName!: string;

  @property({
    type: 'string',
    postgresql: {
      columnName: 'description',
      dataType: 'text',
    },
  })
  description?: string;

  @property({
    type: 'string',
    required: true,
    postgresql: {
      columnName: 'status',
      dataType: 'varchar',
      dataLength: 20,
    },
  })
  status: 'active' | 'inactive' = 'active';

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

  constructor(data?: Partial<Group>) {
    super(data);
  }
}

export interface GroupRelations {
  // describe navigational properties here
}

export type GroupWithRelations = Group & GroupRelations; 
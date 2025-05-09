/**
 * Copyright 2025 ogt11.com, llc
 */

import {Entity, model, property} from '@loopback/repository';

@model({
  name: 'requests',
  settings: {
    postgresql: {
      schema: 'public',
      table: 'requests',
    },
    indexes: {
      idx_requests_username: {
        keys: {
          username: 1,
        },
      },
      idx_requests_email: {
        keys: {
          email: 1,
        },
      },
      idx_requests_status: {
        keys: {
          status: 1,
        },
      },
    },
  },
})
export class Request extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
    useDefaultIdType: false,
    postgresql: {
      dataType: 'uuid',
    },
  })
  id!: string;

  @property({
    type: 'string',
    required: true,
    postgresql: {
      dataType: 'varchar',
      dataLength: 255,
    },
  })
  username!: string;

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
    required: true,
    postgresql: {
      dataType: 'varchar',
      dataLength: 255,
    },
  })
  email!: string;

  @property({
    type: 'string',
    required: true,
    default: 'pending',
    postgresql: {
      dataType: 'varchar',
      dataLength: 20,
    },
  })
  status!: 'pending' | 'approved' | 'rejected';

  @property({
    type: 'string',
    required: true,
    postgresql: {
      dataType: 'text',
    },
  })
  challenge!: string;

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

  constructor(data?: Partial<Request>) {
    super(data);
  }
}

export interface RequestRelations {
  // describe navigational properties here
}

export type RequestWithRelations = Request & RequestRelations; 
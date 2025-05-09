/**
 * Copyright 2025 ogt11.com, llc
 */

import {Entity, model, property} from '@loopback/repository';

@model({
  name: 'certificates',
  settings: {
    postgresql: {
      schema: 'public',
      table: 'certificates',
    },
    indexes: {
      idx_certificates_fingerprint: {
        keys: {
          fingerprint: 1,
        },
        options: {
          unique: true,
        },
      },
      idx_certificates_status: {
        keys: {
          status: 1,
        },
      },
    },
  },
})
export class Certificate extends Entity {
  @property({
    type: 'string',
    id: true,
    required: true,
    postgresql: {
      columnName: 'serial_number',
      dataType: 'uuid',
    },
  })
  serialNumber!: string;

  @property({
    type: 'string',
    required: true,
    postgresql: {
      dataType: 'varchar',
      dataLength: 50,
      columnName: 'code_version',
    },
  })
  codeVersion!: string;

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
      columnName: 'user_id',
      dataType: 'uuid',
    },
  })
  userId!: string;

  @property({
    type: 'string',
    required: true,
    postgresql: {
      dataType: 'varchar',
      dataLength: 255,
      columnName: 'common_name',
    },
  })
  commonName!: string;

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
    postgresql: {
      columnName: 'fingerprint',
      dataType: 'text',
    },
  })
  fingerprint!: string;

  @property({
    type: 'date',
    required: true,
    postgresql: {
      columnName: 'not_before',
      dataType: 'timestamp with time zone',
    },
  })
  notBefore!: Date;

  @property({
    type: 'date',
    required: true,
    postgresql: {
      columnName: 'not_after',
      dataType: 'timestamp with time zone',
    },
  })
  notAfter!: Date;

  @property({
    type: 'string',
    required: true,
    postgresql: {
      columnName: 'status',
      dataType: 'varchar',
      dataLength: 20,
    },
  })
  status!: 'active' | 'revoked';

  @property({
    type: 'date',
    postgresql: {
      columnName: 'revoked_at',
      dataType: 'timestamp with time zone',
    },
  })
  revokedAt?: Date;

  @property({
    type: 'string',
    postgresql: {
      columnName: 'revoked_by',
      dataType: 'varchar',
      dataLength: 255,
    },
  })
  revokedBy?: string;

  @property({
    type: 'string',
    postgresql: {
      columnName: 'revocation_reason',
      dataType: 'text',
    },
  })
  revocationReason?: string;

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

  constructor(data?: Partial<Certificate>) {
    super(data);
  }
}

export interface CertificateRelations {
  // describe navigational properties here
}

export type CertificateWithRelations = Certificate & CertificateRelations; 
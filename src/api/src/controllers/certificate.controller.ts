/**
 * Copyright 2025 ogt11.com, llc
 */

import {post, param, requestBody, get, patch} from '@loopback/rest';
import {Certificate} from '../models';
import {CertificateRepository} from '../repositories';
import {HttpErrors} from '@loopback/rest';
import {repository} from '@loopback/repository';

export class CertificateController {
  constructor(
    @repository(CertificateRepository)
    private certificateRepository: CertificateRepository,
  ) {}

  @post('/certificates', {
    responses: {
      '200': {
        description: 'Certificate model instance',
        content: {'application/json': {schema: {'x-ts-type': Certificate}}},
      },
    },
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: [
              'serialNumber',
              'codeVersion',
              'username',
              'commonName',
              'email',
              'fingerprint',
              'notBefore',
              'notAfter',
              'userId',
            ],
            properties: {
              serialNumber: {type: 'string'},
              codeVersion: {type: 'string'},
              username: {type: 'string'},
              commonName: {type: 'string'},
              email: {type: 'string'},
              fingerprint: {type: 'string'},
              notBefore: {type: 'string', format: 'date-time'},
              notAfter: {type: 'string', format: 'date-time'},
              userId: {type: 'string'},
            },
          },
        },
      },
    })
    certificate: Omit<Certificate, 'id'>,
  ): Promise<Certificate> {
    const existingCertificate = await this.certificateRepository.findOne({
      where: {fingerprint: certificate.fingerprint},
    });

    if (existingCertificate) {
      throw new HttpErrors.Conflict('Certificate with this fingerprint already exists');
    }

    if (certificate.notBefore >= certificate.notAfter) {
      throw new HttpErrors.BadRequest('notBefore must be before notAfter');
    }

    return this.certificateRepository.create({
      ...certificate,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  @get('/certificates', {
    responses: {
      '200': {
        description: 'Array of Certificate model instances',
        content: {'application/json': {schema: {'x-ts-type': Certificate}}},
      },
    },
  })
  async find(
    @param.query.string('username') username?: string,
    @param.query.string('status') status?: 'active' | 'revoked',
  ): Promise<Certificate[]> {
    const where: any = {};
    if (username) where.username = username;
    if (status) where.status = status;
    return this.certificateRepository.find({where});
  }

  @get('/certificates/{id}', {
    responses: {
      '200': {
        description: 'Certificate model instance',
        content: {'application/json': {schema: {'x-ts-type': Certificate}}},
      },
    },
  })
  async findById(@param.path.string('id') id: string): Promise<Certificate> {
    const certificate = await this.certificateRepository.findById(id);
    if (!certificate) {
      throw new HttpErrors.NotFound('Certificate not found');
    }
    return certificate;
  }

  @patch('/certificates/{id}', {
    responses: {
      '204': {
        description: 'Certificate PATCH success',
      },
    },
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              codeVersion: {type: 'string'},
              commonName: {type: 'string'},
              email: {type: 'string'},
              notBefore: {type: 'string', format: 'date-time'},
              notAfter: {type: 'string', format: 'date-time'},
            },
          },
        },
      },
    })
    certificate: Partial<Certificate>,
  ): Promise<void> {
    const existingCertificate = await this.certificateRepository.findById(id);
    if (!existingCertificate) {
      throw new HttpErrors.NotFound('Certificate not found');
    }

    if (existingCertificate.status === 'revoked') {
      throw new HttpErrors.BadRequest('Cannot update a revoked certificate');
    }

    if (certificate.notBefore && certificate.notAfter) {
      if (certificate.notBefore >= certificate.notAfter) {
        throw new HttpErrors.BadRequest('notBefore must be before notAfter');
      }
    }

    await this.certificateRepository.updateById(id, {
      ...certificate,
      updatedAt: new Date(),
    });
  }

  @post('/certificates/{id}/revoke', {
    responses: {
      '204': {
        description: 'Certificate revocation success',
      },
    },
  })
  async revoke(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['revokedBy', 'revocationReason'],
            properties: {
              revokedBy: {type: 'string'},
              revocationReason: {type: 'string'},
            },
          },
        },
      },
    })
    data: {revokedBy: string; revocationReason: string},
  ): Promise<void> {
    const certificate = await this.certificateRepository.findById(id);
    if (!certificate) {
      throw new HttpErrors.NotFound('Certificate not found');
    }

    if (certificate.status === 'revoked') {
      throw new HttpErrors.BadRequest('Certificate is already revoked');
    }

    await this.certificateRepository.updateById(id, {
      status: 'revoked',
      revokedAt: new Date(),
      revokedBy: data.revokedBy,
      revocationReason: data.revocationReason,
      updatedAt: new Date(),
      updatedBy: data.revokedBy,
    });
  }
} 
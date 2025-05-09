/**
 * Copyright 2025 ogt11.com, llc
 */

import {
  HttpErrors,
  post,
  param,
  get,
  requestBody,
  getModelSchemaRef,
} from '@loopback/rest';
import {repository} from '@loopback/repository';
import {Request, RequestWithRelations} from '../models';
import {RequestRepository} from '../repositories';
import {v4 as uuidv4} from 'uuid';

export class RequestController {
  constructor(
    @repository(RequestRepository)
    public requestRepository: RequestRepository,
  ) {}

  @post('/requests', {
    responses: {
      '200': {
        description: 'Request model instance',
        content: {'application/json': {schema: getModelSchemaRef(Request)}},
      },
      '409': {
        description: 'Request with this username already exists',
      },
    },
  })
  async createRequest(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Request, {
            title: 'NewRequest',
            exclude: ['id', 'status', 'challenge', 'createdAt', 'updatedAt'],
          }),
        },
      },
    })
    request: Omit<Request, 'id'>,
  ): Promise<Request> {
    const existingRequest = await this.requestRepository.findOne({
      where: {username: request.username},
    });
    if (existingRequest) {
      throw new HttpErrors.Conflict('Request with this username already exists');
    }
    return this.requestRepository.create({
      ...request,
      status: 'pending',
      challenge: `challenge-${uuidv4()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  @get('/requests/{id}', {
    responses: {
      '200': {
        description: 'Request model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Request, {includeRelations: true}),
          },
        },
      },
      '404': {
        description: 'Request not found',
      },
    },
  })
  async getRequest(
    @param.path.string('id') id: string,
  ): Promise<RequestWithRelations> {
    const request = await this.requestRepository.findById(id);
    if (!request) {
      throw new HttpErrors.NotFound('Request not found');
    }
    return request;
  }

  @get('/requests/search', {
    responses: {
      '200': {
        description: 'Array of Request model instances',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Request, {includeRelations: true}),
            },
          },
        },
      },
    },
  })
  async searchRequests(
    @param.query.string('username') username?: string,
    @param.query.string('email') email?: string,
    @param.query.string('status') status?: string,
  ): Promise<Request[]> {
    const where: any = {};
    if (username) {
      where.username = username;
    }
    if (email) {
      where.email = email;
    }
    if (status) {
      where.status = status;
    }
    return this.requestRepository.find({where});
  }

  @post('/requests/{id}/validate', {
    responses: {
      '204': {
        description: 'Request validated successfully',
      },
      '400': {
        description: 'Invalid request state or challenge token',
      },
      '404': {
        description: 'Request not found',
      },
    },
  })
  async validate(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['challenge'],
            properties: {
              challenge: {type: 'string'},
            },
          },
        },
      },
    })
    data: {challenge: string},
  ): Promise<void> {
    const request = await this.requestRepository.findById(id);
    if (!request) {
      throw new HttpErrors.NotFound('Request not found');
    }

    if (request.status !== 'pending') {
      throw new HttpErrors.BadRequest('Request is not pending');
    }

    if (request.challenge !== data.challenge) {
      throw new HttpErrors.BadRequest('Invalid challenge');
    }

    await this.requestRepository.updateById(id, {
      status: 'approved',
      updatedAt: new Date(),
    });
  }

  @post('/requests/{id}/cancel', {
    responses: {
      '204': {
        description: 'Request cancelled successfully',
      },
      '400': {
        description: 'Invalid request state',
      },
      '404': {
        description: 'Request not found',
      },
    },
  })
  async cancel(
    @param.path.string('id') id: string,
  ): Promise<void> {
    const request = await this.requestRepository.findById(id);
    if (!request) {
      throw new HttpErrors.NotFound('Request not found');
    }

    if (request.status !== 'pending') {
      throw new HttpErrors.BadRequest('Request is not pending');
    }

    await this.requestRepository.updateById(id, {
      status: 'rejected',
      updatedAt: new Date(),
    });
  }
} 
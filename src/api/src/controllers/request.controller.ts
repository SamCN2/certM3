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
import {RequestRepository, UserRepository} from '../repositories';
import {v4 as uuidv4} from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

export class RequestController {
  constructor(
    @repository(RequestRepository)
    public requestRepository: RequestRepository,
    @repository(UserRepository)
    public userRepository: UserRepository,
  ) {}

  private async generateValidationEmail(request: Request): Promise<void> {
    const emailDir = '/var/spool/certM3/test-emails';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}-${request.username}-validation.txt`;
    const filepath = path.join(emailDir, filename);

    console.log('Generating validation email:');
    console.log('- Directory:', emailDir);
    console.log('- Filename:', filename);
    console.log('- Full path:', filepath);

    const emailContent = `
To: ${request.email}
Subject: Validate your certM3 account request

Dear ${request.displayName},

Thank you for requesting a certM3 account. To validate your account, please use one of the following methods:

1. Click this link to validate automatically:
   https://urp.ogt11.com/app/validate/${request.id}/${request.challenge}

2. Or visit this page and enter your validation code:
   https://urp.ogt11.com/app/validate/${request.id}
   
   Your validation code is: ${request.challenge}

This validation link will expire in 24 hours.

Best regards,
The certM3 Team
`;

    try {
      await fs.promises.writeFile(filepath, emailContent);
      console.log(`✓ Test email written to ${filepath}`);
    } catch (error) {
      console.error('Error writing test email:', error);
      console.error('- Error details:', error.message);
      console.error('- Error code:', error.code);
      // Don't throw - we don't want to fail the request just because we couldn't write the test email
    }
  }

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

    const newRequest = await this.requestRepository.create({
      ...request,
      status: 'pending',
      challenge: `challenge-${uuidv4()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Generate test email
    await this.generateValidationEmail(newRequest);

    return newRequest;
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

  @get('/request/check-username/{username}', {
    responses: {
      '200': {
        description: 'Username exists',
      },
      '404': {
        description: 'Username is available',
      },
    },
  })
  async checkUsername(
    @param.path.string('username') username: string,
  ): Promise<void> {
    console.log('Checking username:', username);
    
    // Check both tables
    const [existingRequest, existingUser] = await Promise.all([
      this.requestRepository.findOne({
        where: {username: username},
      }),
      this.userRepository.findOne({
        where: {username: username},
      })
    ]);
    
    if (existingRequest || existingUser) {
      console.log('Username found:', username, 
        existingRequest ? `in request (${existingRequest.status})` : 'in users table');
      return; // Returns 200
    }
    
    console.log('Username not found:', username);
    throw new HttpErrors.NotFound('Username is available');
  }
} 
/**
 * Copyright 2025 ogt11.com, llc
 */

import {post, param, requestBody, get, patch} from '@loopback/rest';
import {Users} from '../models';
import {UserRepository} from '../repositories';
import {HttpErrors} from '@loopback/rest';
import {repository} from '@loopback/repository';

export class UserController {
  constructor(
    @repository(UserRepository)
    private usersRepository: UserRepository,
  ) {}

  @post('/users', {
    responses: {
      '200': {
        description: 'User model instance',
        content: {'application/json': {schema: {'x-ts-type': Users}}},
      },
      '409': {
        description: 'Username or email already exists',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: {
                  type: 'object',
                  properties: {
                    statusCode: {type: 'number', example: 409},
                    name: {type: 'string', example: 'ConflictError'},
                    message: {type: 'string', example: 'Username already exists'},
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['username', 'email', 'displayName'],
            properties: {
              username: {type: 'string'},
              email: {type: 'string'},
              displayName: {type: 'string'},
            },
          },
        },
      },
    })
    user: Omit<Users, 'id'>,
  ): Promise<Users> {
    const existingUser = await this.usersRepository.findOne({
      where: {
        or: [
          {username: user.username},
          {email: user.email},
        ],
      },
    });

    if (existingUser) {
      throw new HttpErrors.Conflict(
        existingUser.username === user.username
          ? 'Username already exists'
          : 'Email already exists'
      );
    }

    return this.usersRepository.create({
      ...user,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  @get('/users', {
    responses: {
      '200': {
        description: 'Array of User model instances',
        content: {'application/json': {schema: {'x-ts-type': Users}}},
      },
    },
  })
  async find(
    @param.query.string('status') status?: 'active' | 'inactive',
  ): Promise<Users[]> {
    const filter = status ? {where: {status}} : undefined;
    return this.usersRepository.find(filter);
  }

  @get('/users/{id}', {
    responses: {
      '200': {
        description: 'User model instance',
        content: {'application/json': {schema: {'x-ts-type': Users}}},
      },
    },
  })
  async findById(@param.path.string('id') id: string): Promise<Users> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new HttpErrors.NotFound('User not found');
    }
    return user;
  }

  @patch('/users/{id}', {
    responses: {
      '204': {
        description: 'User PATCH success',
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
              displayName: {type: 'string'},
              email: {type: 'string'},
            },
          },
        },
      },
    })
    user: Partial<Users>,
  ): Promise<void> {
    const existingUser = await this.usersRepository.findById(id);
    if (!existingUser) {
      throw new HttpErrors.NotFound('User not found');
    }

    if (user.email && user.email !== existingUser.email) {
      const emailExists = await this.usersRepository.findOne({
        where: {email: user.email},
      });
      if (emailExists) {
        throw new HttpErrors.Conflict('Email already exists');
      }
    }

    await this.usersRepository.updateById(id, {
      ...user,
      updatedAt: new Date(),
    });
  }

  @post('/users/{id}/deactivate', {
    responses: {
      '204': {
        description: 'User deactivation success',
      },
    },
  })
  async deactivate(
    @param.path.string('id') id: string,
  ): Promise<void> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new HttpErrors.NotFound('User not found');
    }

    if (user.status === 'inactive') {
      throw new HttpErrors.BadRequest('User is already inactive');
    }

    await this.usersRepository.updateById(id, {
      status: 'inactive',
      updatedAt: new Date(),
    });
  }
} 
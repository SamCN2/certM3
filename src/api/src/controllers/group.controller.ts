/**
 * Copyright 2025 ogt11.com, llc
 */

import {repository} from '@loopback/repository';
import {post, param, get, put, patch, del, requestBody, response, HttpErrors} from '@loopback/rest';
import {Group} from '../models/group.model';
import {GroupRepository} from '../repositories/group.repository';
import {UserGroupRepository} from '../repositories/user-group.repository';
import {UserRepository} from '../repositories/user.repository';
import {Users} from '../models/user.model';
import {Logger} from '../logger';

export class GroupController {
  private logger = Logger.getInstance();

  constructor(
    @repository(GroupRepository)
    private groupRepository: GroupRepository,
    @repository(UserGroupRepository)
    private userGroupRepository: UserGroupRepository,
    @repository(UserRepository)
    private userRepository: UserRepository,
  ) {}

  @post('/groups')
  @response(200, {
    description: 'Group model instance',
    content: {'application/json': {schema: {'x-ts-type': Group}}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['name', 'displayName'],
            properties: {
              name: {type: 'string'},
              displayName: {type: 'string'},
              description: {type: 'string'},
            },
          },
        },
      },
    })
    group: Omit<Group, 'id'>,
  ): Promise<Group> {
    this.logger.info('Creating new group', { group_name: group.name, display_name: group.displayName });
    
    try {
      const result = await this.groupRepository.create(group);
      this.logger.info('Group created successfully', { group_name: group.name, group_id: result.name });
      return result;
    } catch (error) {
      this.logger.error('Failed to create group', { 
        group_name: group.name, 
        error: error.message 
      });
      throw error;
    }
  }

  @get('/groups')
  @response(200, {
    description: 'Array of Group model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: {'x-ts-type': Group},
        },
      },
    },
  })
  async find(): Promise<Group[]> {
    this.logger.debug('Fetching all groups');
    return this.groupRepository.find();
  }

  @get('/groups/{name}')
  @response(200, {
    description: 'Group model instance',
    content: {
      'application/json': {
        schema: {'x-ts-type': Group},
      },
    },
  })
  async findById(@param.path.string('name') name: string): Promise<Group> {
    this.logger.debug('Fetching group by name', { group_name: name });
    
    const group = await this.groupRepository.findById(name);
    if (!group) {
      this.logger.warn('Group not found', { group_name: name });
      throw new HttpErrors.NotFound(`Group ${name} not found`);
    }
    
    return group;
  }

  @put('/groups/{name}')
  @response(204, {
    description: 'Group PUT success',
  })
  async updateById(
    @param.path.string('name') name: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              displayName: {type: 'string'},
              description: {type: 'string'},
            },
          },
        },
      },
    })
    group: Partial<Group>,
  ): Promise<void> {
    this.logger.info('Updating group', { group_name: name, updates: group });
    
    try {
      await this.groupRepository.updateById(name, group);
      this.logger.info('Group updated successfully', { group_name: name });
    } catch (error) {
      this.logger.error('Failed to update group', { 
        group_name: name, 
        error: error.message 
      });
      throw error;
    }
  }

  @patch('/groups/{name}')
  @response(204, {
    description: 'Group PATCH success',
  })
  async updateByIdPatch(
    @param.path.string('name') name: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              displayName: {type: 'string'},
              description: {type: 'string'},
            },
          },
        },
      },
    })
    group: Partial<Group>,
  ): Promise<void> {
    this.logger.info('Patching group', { group_name: name, updates: group });
    
    try {
      await this.groupRepository.updateById(name, group);
      this.logger.info('Group patched successfully', { group_name: name });
    } catch (error) {
      this.logger.error('Failed to patch group', { 
        group_name: name, 
        error: error.message 
      });
      throw error;
    }
  }

  @del('/groups/{name}')
  @response(204, {
    description: 'Group DELETE success',
  })
  async deactivate(@param.path.string('name') name: string): Promise<void> {
    this.logger.warn('Deactivating group', { group_name: name });
    
    try {
      await this.groupRepository.updateById(name, {status: 'inactive'});
      this.logger.info('Group deactivated successfully', { group_name: name });
    } catch (error) {
      this.logger.error('Failed to deactivate group', { 
        group_name: name, 
        error: error.message 
      });
      throw error;
    }
  }

  @get('/groups/{name}/members')
  @response(200, {
    description: 'Array of User model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: {'x-ts-type': Users},
        },
      },
    },
  })
  async getMembers(
    @param.path.string('name') name: string,
  ): Promise<Users[]> {
    this.logger.debug('Fetching group members', { group_name: name });
    
    try {
      const memberships = await this.userGroupRepository.find({
        where: {groupName: name},
      });

      const userIds = memberships.map(m => m.userId);
      const users = await this.userRepository.find({
        where: {id: {inq: userIds}},
      });

      this.logger.debug('Group members retrieved', { 
        group_name: name, 
        member_count: users.length 
      });
      
      return users;
    } catch (error) {
      this.logger.error('Failed to get group members', { 
        group_name: name, 
        error: error.message 
      });
      throw error;
    }
  }

  @post('/groups/{name}/members')
  @response(204, {
    description: 'Add members to group success',
  })
  async addMembers(
    @param.path.string('name') name: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['userIds'],
            properties: {
              userIds: {
                type: 'array',
                items: {type: 'string', format: 'uuid'},
              },
              createdAt: {type: 'string', format: 'date-time'},
              updatedAt: {type: 'string', format: 'date-time'},
              createdBy: {type: 'string'},
              updatedBy: {type: 'string'},
            },
          },
        },
      },
    })
    data: {userIds: string[], createdAt?: string, updatedAt?: string, createdBy?: string, updatedBy?: string},
  ): Promise<void> {
    this.logger.info('Adding members to group', { 
      group_name: name, 
      user_count: data.userIds.length,
      user_ids: data.userIds 
    });
    
    try {
      const group = await this.groupRepository.findById(name);
      this.logger.debug('Group found for member addition', { group_name: name });
      
      if (!group) {
        this.logger.warn('Group not found for member addition', { group_name: name });
        throw new HttpErrors.NotFound(`Group ${name} not found`);
      }

      for (const userId of data.userIds) {
        // Check if user exists
        const user = await this.userRepository.findById(userId);
        this.logger.debug('User found for group membership', { user_id: userId, group_name: name });
        
        if (!user) {
          this.logger.warn('User not found for group membership', { user_id: userId, group_name: name });
          throw new HttpErrors.NotFound(`User ${userId} not found`);
        }

        // Check if user is already a member
        const existingMembership = await this.userGroupRepository.findOne({
          where: {
            userId: userId,
            groupName: name,
          },
        });
        this.logger.debug('Checking existing membership', { user_id: userId, group_name: name });

        if (existingMembership) {
          this.logger.info('User already a member, skipping', { user_id: userId, group_name: name });
          continue; // Skip this user and continue with the next one
        }

        try {
          // Add new membership
          await this.userGroupRepository.create({
            userId: userId,
            groupName: name,
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
            createdBy: data.createdBy || 'system',
            updatedBy: data.updatedBy || 'system',
          });
          this.logger.info('New membership created', { 
            user_id: userId, 
            group_name: name
          });
        } catch (error) {
          this.logger.error('Error creating membership', { 
            user_id: userId, 
            group_name: name, 
            error: error.message 
          });
          throw error;
        }
      }
      
      this.logger.info('All members added to group successfully', { 
        group_name: name, 
        user_count: data.userIds.length 
      });
    } catch (error) {
      this.logger.error('Failed to add members to group', { 
        group_name: name, 
        error: error.message 
      });
      throw error;
    }
  }

  @del('/groups/{name}/members', {
    responses: {
      '204': {
        description: 'Remove members from group success',
      },
    },
  })
  async removeMembers(
    @param.path.string('name') _name: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['userIds'],
            properties: {
              userIds: {
                type: 'array',
                items: {type: 'string', format: 'uuid'},
              },
            },
          },
        },
      },
    })
    _data: {userIds: string[]},
  ): Promise<void> {
    // Prevent removing users from any group to maintain history
    this.logger.warn('Attempt to remove members from group blocked', { 
      group_name: _name, 
      reason: 'Group membership history must be preserved' 
    });
    throw new HttpErrors.Forbidden('Cannot remove users from groups - group membership history must be preserved');
  }
} 
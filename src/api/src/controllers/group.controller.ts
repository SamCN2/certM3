/**
 * Copyright 2025 ogt11.com, llc
 */

import {post, param, requestBody, get, patch, del} from '@loopback/rest';
import {Group, Users} from '../models';
import {GroupRepository, UserGroupRepository, UserRepository} from '../repositories';
import {HttpErrors} from '@loopback/rest';
import {repository} from '@loopback/repository';
import * as fs from 'fs';

export class GroupController {
  constructor(
    @repository(GroupRepository)
    private groupRepository: GroupRepository,
    @repository(UserGroupRepository)
    private userGroupRepository: UserGroupRepository,
    @repository(UserRepository)
    private userRepository: UserRepository,
  ) {}

  @post('/groups', {
    responses: {
      '200': {
        description: 'Group model instance',
        content: {'application/json': {schema: {'x-ts-type': Group}}},
      },
    },
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
    // Check if group already exists
    const existingGroup = await this.groupRepository.findOne({
      where: {name: group.name}
    });
    if (existingGroup) {
      throw new HttpErrors.Conflict('Group with this name already exists');
    }

    // Special handling for 'users' group
    if (group.name === 'users') {
      throw new HttpErrors.Conflict('Cannot create the users group - it is a protected system group');
    }

    return this.groupRepository.create({
      ...group,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  @get('/groups', {
    responses: {
      '200': {
        description: 'Array of Group model instances',
        content: {'application/json': {schema: {'x-ts-type': Group}}},
      },
    },
  })
  async find(): Promise<Group[]> {
    return this.groupRepository.find();
  }

  @get('/groups/{name}', {
    responses: {
      '200': {
        description: 'Group model instance',
        content: {'application/json': {schema: {'x-ts-type': Group}}},
      },
    },
  })
  async findById(@param.path.string('name') name: string): Promise<Group> {
    const group = await this.groupRepository.findById(name);
    if (!group) {
      throw new HttpErrors.NotFound('Group not found');
    }
    return group;
  }

  @patch('/groups/{name}', {
    responses: {
      '204': {
        description: 'Group PATCH success',
      },
    },
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
    const existingGroup = await this.groupRepository.findById(name);
    if (!existingGroup) {
      throw new HttpErrors.NotFound('Group not found');
    }

    if (existingGroup.name === 'users') {
      throw new HttpErrors.Forbidden('Cannot modify the users group');
    }

    await this.groupRepository.updateById(name, {
      ...group,
      updatedAt: new Date(),
    });
  }

  @post('/groups/{name}/deactivate', {
    responses: {
      '204': {
        description: 'Group deactivation success',
      },
    },
  })
  async deactivate(@param.path.string('name') name: string): Promise<void> {
    // Check if group exists
    const group = await this.groupRepository.findById(name);
    if (!group) {
      throw new HttpErrors.NotFound('Group not found');
    }

    // Check if it's the users group
    if (group.name === 'users') {
      throw new HttpErrors.Forbidden('Cannot deactivate the users group');
    }

    // Update the group status
    await this.groupRepository.updateById(name, {
      status: 'inactive',
      updatedAt: new Date(),
      updatedBy: 'system'
    });
  }

  @get('/groups/{name}/members', {
    responses: {
      '200': {
        description: 'Array of User model instances',
        content: {'application/json': {schema: {'x-ts-type': Users}}},
      },
    },
  })
  async getMembers(
    @param.path.string('name') name: string,
  ): Promise<Users[]> {
    const group = await this.groupRepository.findOne({
      where: {name: name}
    });
    if (!group) {
      throw new HttpErrors.NotFound('Group not found');
    }

    try {
      // First get the user IDs from user_groups
      const userGroups = await this.userGroupRepository.find({
        where: {groupName: name},
        fields: ['userId']
      });

      // Then get the users
      const userIds = userGroups.map(ug => ug.userId);
      const users = await this.userRepository.find({
        where: {
          id: {inq: userIds}
        },
        fields: ['id', 'username', 'email', 'displayName', 'status']
      });

      return users;
    } catch (error) {
      console.error('Error fetching members:', error);
      throw new HttpErrors.InternalServerError('Error fetching members');
    }
  }

  @post('/groups/{name}/members', {
    responses: {
      '204': {
        description: 'Add members to group success',
      },
    },
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
    fs.appendFileSync('/var/spool/certM3/stupid.log', `[${new Date().toISOString()}] [addMembers] Attempting to add users to group: ${name}, userIds: ${JSON.stringify(data.userIds)}\n`);
    try {
      const group = await this.groupRepository.findById(name);
      fs.appendFileSync('/var/spool/certM3/stupid.log', `[${new Date().toISOString()}] [addMembers] Found group: ${JSON.stringify(group)}\n`);
      if (!group) {
        fs.appendFileSync('/var/spool/certM3/stupid.log', `[${new Date().toISOString()}] [addMembers] Group not found: ${name}\n`);
        throw new HttpErrors.NotFound(`Group ${name} not found`);
      }

      for (const userId of data.userIds) {
        // Check if user exists
        const user = await this.userRepository.findById(userId);
        fs.appendFileSync('/var/spool/certM3/stupid.log', `[${new Date().toISOString()}] [addMembers] Found user: ${JSON.stringify(user)}\n`);
        if (!user) {
          fs.appendFileSync('/var/spool/certM3/stupid.log', `[${new Date().toISOString()}] [addMembers] User not found: ${userId}\n`);
          throw new HttpErrors.NotFound(`User ${userId} not found`);
        }

        // Check if user is already a member
        const existingMembership = await this.userGroupRepository.findOne({
          where: {
            userId: userId,
            groupName: name,
          },
        });
        fs.appendFileSync('/var/spool/certM3/stupid.log', `[${new Date().toISOString()}] [addMembers] Existing membership: ${JSON.stringify(existingMembership)}\n`);

        if (existingMembership) {
          fs.appendFileSync('/var/spool/certM3/stupid.log', `[${new Date().toISOString()}] [addMembers] User is already a member: ${userId} in group ${name}\n`);
          continue; // Skip this user and continue with the next one
        }

        try {
          // Add new membership
          const newMembership = await this.userGroupRepository.create({
            userId: userId,
            groupName: name,
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
            createdBy: data.createdBy || 'system',
            updatedBy: data.updatedBy || 'system',
          });
          fs.appendFileSync('/var/spool/certM3/stupid.log', `[${new Date().toISOString()}] [addMembers] Created new membership: ${JSON.stringify(newMembership)}\n`);
        } catch (error) {
          fs.appendFileSync('/var/spool/certM3/stupid.log', `[${new Date().toISOString()}] [addMembers] Error creating membership: ${error && error.stack ? error.stack : error}\n`);
          throw error;
        }
      }
    } catch (error) {
      fs.appendFileSync('/var/spool/certM3/stupid.log', `[${new Date().toISOString()}] [addMembers] Outer error: ${error && error.stack ? error.stack : error}\n`);
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
    throw new HttpErrors.Forbidden('Cannot remove users from groups - group membership history must be preserved');
  }
} 
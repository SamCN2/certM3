/**
 * Copyright 2025 ogt11.com, llc
 */

import {post, param, requestBody, get, patch, del} from '@loopback/rest';
import {Group, Users, UserGroup} from '../models';
import {GroupRepository, UserGroupRepository} from '../repositories';
import {HttpErrors} from '@loopback/rest';
import {Where, repository} from '@loopback/repository';

export class GroupController {
  constructor(
    @repository(GroupRepository)
    private groupRepository: GroupRepository,
    @repository(UserGroupRepository)
    private userGroupRepository: UserGroupRepository,
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
    const existingGroup = await this.groupRepository.findById(group.name);
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

  @get('/groups/{id}', {
    responses: {
      '200': {
        description: 'Group model instance',
        content: {'application/json': {schema: {'x-ts-type': Group}}},
      },
    },
  })
  async findById(@param.path.string('id') id: string): Promise<Group> {
    const group = await this.groupRepository.findById(id);
    if (!group) {
      throw new HttpErrors.NotFound('Group not found');
    }
    return group;
  }

  @patch('/groups/{id}', {
    responses: {
      '204': {
        description: 'Group PATCH success',
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
              description: {type: 'string'},
            },
          },
        },
      },
    })
    group: Partial<Group>,
  ): Promise<void> {
    const existingGroup = await this.groupRepository.findById(id);
    if (!existingGroup) {
      throw new HttpErrors.NotFound('Group not found');
    }

    if (existingGroup.name === 'users') {
      throw new HttpErrors.Forbidden('Cannot modify the users group');
    }

    await this.groupRepository.updateById(id, {
      ...group,
      updatedAt: new Date(),
    });
  }

  @del('/groups/{id}', {
    responses: {
      '204': {
        description: 'Group DELETE success',
      },
    },
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    const group = await this.groupRepository.findById(id);
    if (!group) {
      throw new HttpErrors.NotFound('Group not found');
    }

    if (group.name === 'users') {
      throw new HttpErrors.Forbidden('Cannot delete the users group');
    }

    await this.groupRepository.updateById(id, {
      status: 'inactive',
      updatedAt: new Date(),
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
    const group = await this.groupRepository.findById(name);
    if (!group) {
      throw new HttpErrors.NotFound('Group not found');
    }

    const userGroups = await this.userGroupRepository.find({
      where: {groupName: name},
      include: ['user'],
    });

    return userGroups.map(ug => ug.user);
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
            },
          },
        },
      },
    })
    data: {userIds: string[]},
  ): Promise<void> {
    const group = await this.groupRepository.findById(name);
    if (!group) {
      throw new HttpErrors.NotFound('Group not found');
    }

    await Promise.all(
      data.userIds.map(userId =>
        this.userGroupRepository.create({
          userId,
          groupName: name,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
    );
  }

  @del('/groups/{name}/members', {
    responses: {
      '204': {
        description: 'Remove members from group success',
      },
    },
  })
  async removeMembers(
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
            },
          },
        },
      },
    })
    data: {userIds: string[]},
  ): Promise<void> {
    if (name === 'users') {
      throw new HttpErrors.Forbidden('Cannot remove users from the users group');
    }

    const group = await this.groupRepository.findById(name);
    if (!group) {
      throw new HttpErrors.NotFound('Group not found');
    }

    const where: Where<UserGroup> = {
      and: [
        {groupName: name},
        {userId: {inq: data.userIds}},
      ],
    };

    await this.userGroupRepository.deleteAll(where);
  }
} 
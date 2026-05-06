/// <reference types="jest" />

jest.mock('../schema/project.schema', () => ({
  Project: class Project {},
}));

jest.mock('src/modules/tasks/entities/task.entity', () => ({
  Task: class Task {},
}));

jest.mock('src/modules/activity/schemas/activity.schemas', () => ({
  Activity: class Activity {},
}));

jest.mock(
  'src/modules/notification/services/notification-push.service',
  () => ({
    NotificationPushService: class NotificationPushService {},
  }),
);

jest.mock('src/storage/storage.service', () => ({
  StorageService: class StorageService {},
}));

jest.mock('src/modules/activity/services/activity.service', () => ({
  ActivityService: class ActivityService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ProjectService } from '../services/project.service';
import { Role } from 'src/modules/auth/types/auth.types';
import { NotificationPushService } from 'src/modules/notification/services/notification-push.service';
import { StorageService } from 'src/storage/storage.service';
import { ActivityService } from 'src/modules/activity/services/activity.service';

class ProjectModelMock {
  static find = jest.fn();
  static findOne = jest.fn();
  static findById = jest.fn();
  static findByIdAndUpdate = jest.fn();

  save = jest.fn();
  deleteOne = jest.fn();
  _id?: Types.ObjectId;

  constructor(data: Record<string, unknown>) {
    Object.assign(this, data);
    this._id = new Types.ObjectId();
    this.save.mockResolvedValue(this);
    this.deleteOne.mockResolvedValue(undefined);
  }
}

describe('ProjectService', () => {
  let service: ProjectService;

  const taskModel = {
    updateMany: jest.fn(),
    countDocuments: jest.fn(),
  };

  const notificationPushService = {
    pushNotificationToUser: jest.fn(),
    pushNotificationToProjectMembers: jest.fn(),
  };

  const storageService = {
    uploadSingleFile: jest.fn(),
    deleteFile: jest.fn(),
  };

  const activityService = {
    logProjectCreated: jest.fn(),
    logUpdateProject: jest.fn(),
    logMemberChange: jest.fn(),
    logMemberRoleChanged: jest.fn(),
    logProjectDelete: jest.fn(),
    logDeleteProjectColumn: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        { provide: getModelToken('Project'), useValue: ProjectModelMock },
        { provide: getModelToken('Task'), useValue: taskModel },
        { provide: getConnectionToken(), useValue: {} },
        { provide: NotificationPushService, useValue: notificationPushService },
        { provide: StorageService, useValue: storageService },
        { provide: ActivityService, useValue: activityService },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getAllProjects should return all projects for superadmin', async () => {
    ProjectModelMock.find.mockResolvedValue([{ _id: 'project-1' }]);

    const result = await service.getAllProjects('user-1', Role.SUPERADMIN);

    expect(ProjectModelMock.find).toHaveBeenCalledWith();
    expect(result).toEqual([{ _id: 'project-1' }]);
  });

  it('getProjectById should throw when project is missing', async () => {
    ProjectModelMock.findOne.mockResolvedValue(null);

    await expect(
      service.getProjectById('user-1', 'project-1', Role.USER),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('createProject should throw when caller is not superadmin', async () => {
    await expect(
      service.createProject('user-1', Role.USER, {
        name: 'Alpha',
        projectType: 'kanban' as never,
        workspaceId: new Types.ObjectId().toString(),
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('createProject should save project, log activity and push notification', async () => {
    storageService.uploadSingleFile.mockResolvedValue({
      url: 'https://cdn/icon.png',
      key: 'icons/icon.png',
    });

    const dto = {
      name: 'Alpha',
      projectType: 'kanban' as never,
      prefix: 'ALP',
      workspaceId: new Types.ObjectId().toString(),
    };

    const result = await service.createProject('user-1', Role.SUPERADMIN, dto, {
      originalname: 'icon.png',
    } as never);

    expect(storageService.uploadSingleFile).toHaveBeenCalledTimes(1);
    expect(activityService.logProjectCreated).toHaveBeenCalledTimes(1);
    expect(
      notificationPushService.pushNotificationToUser,
    ).toHaveBeenCalledTimes(1);
    expect(result.name).toBe('Alpha');
    expect(result.prefix).toBe('ALP');
    expect(result.icon).toBe('https://cdn/icon.png');
    expect(result.iconKey).toBe('icons/icon.png');
  });

  it('updateProject should throw when project is not accessible', async () => {
    ProjectModelMock.findOne.mockResolvedValue(null);

    await expect(
      service.updateProject('user-1', Role.USER, 'project-1', {
        name: 'Renamed',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('updateProject should update assignee-less tasks when default assignee is newly set', async () => {
    const existingProject = {
      _id: new Types.ObjectId(),
      name: 'Alpha',
      members: [],
      defaultAssignee: null,
      iconKey: null,
    };

    ProjectModelMock.findById.mockResolvedValue(existingProject);
    ProjectModelMock.findByIdAndUpdate.mockResolvedValue({
      ...existingProject,
      defaultAssignee: new Types.ObjectId(),
      name: 'Alpha Updated',
    });

    await service.updateProject('user-1', Role.SUPERADMIN, 'project-1', {
      name: 'Alpha Updated',
      defaultAssignee: new Types.ObjectId().toString(),
    });

    expect(taskModel.updateMany).toHaveBeenCalledTimes(1);
    expect(activityService.logUpdateProject).toHaveBeenCalledTimes(1);
    expect(
      notificationPushService.pushNotificationToProjectMembers,
    ).toHaveBeenCalledTimes(1);
  });

  it('deleteProject should throw when role is not superadmin', async () => {
    await expect(
      service.deleteProject('user-1', Role.USER, 'project-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('deleteProject should delete existing project and emit notifications', async () => {
    const project = {
      _id: new Types.ObjectId(),
      name: 'Alpha',
      deleteOne: jest.fn().mockResolvedValue(undefined),
    };

    ProjectModelMock.findOne.mockResolvedValue(project);

    const result = await service.deleteProject(
      'user-1',
      Role.SUPERADMIN,
      project._id.toString(),
    );

    expect(activityService.logProjectDelete).toHaveBeenCalledWith(
      project._id.toString(),
      'user-1',
    );
    expect(
      notificationPushService.pushNotificationToProjectMembers,
    ).toHaveBeenCalledTimes(1);
    expect(project.deleteOne).toHaveBeenCalledTimes(1);
    expect(result).toEqual(project);
  });

  it('deleteColumn should reject when column has tasks', async () => {
    const project = {
      columns: ['todo', 'done'],
      save: jest.fn(),
    };

    ProjectModelMock.findById.mockResolvedValue(project);
    taskModel.countDocuments.mockResolvedValue(2);

    await expect(
      service.deleteColumn('user-1', Role.SUPERADMIN, 'project-1', 'todo'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deleteColumn should remove empty column and log activity', async () => {
    const project = {
      columns: ['todo', 'done'],
      save: jest.fn().mockResolvedValue(undefined),
    };

    ProjectModelMock.findById.mockResolvedValue(project);
    taskModel.countDocuments.mockResolvedValue(0);

    const result = await service.deleteColumn(
      'user-1',
      Role.SUPERADMIN,
      'project-1',
      'todo',
    );

    expect(project.columns).toEqual(['done']);
    expect(project.save).toHaveBeenCalledTimes(1);
    expect(activityService.logDeleteProjectColumn).toHaveBeenCalledWith(
      'project-1',
      'user-1',
      'todo',
    );
    expect(result).toEqual(project);
  });
});

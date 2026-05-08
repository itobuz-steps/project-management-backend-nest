/// <reference types="jest" />

jest.mock('../../project/schema/project.schema', () => ({
  Project: class Project {},
}));

jest.mock('../entities/task.entity', () => ({
  Task: class Task {},
}));

jest.mock('../../auth/schemas/user.schema', () => ({
  User: class User {},
}));

jest.mock('../entities/worklog.entity', () => ({
  Worklog: class Worklog {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';

import { TasksService } from '../tasks.service';

import { Task } from '../entities/task.entity';
import { Project } from '../../project/schema/project.schema';
import { User } from '../../auth/schemas/user.schema';
import { Worklog } from '../entities/worklog.entity';

import { ActivityService } from '../../activity/services/activity.service';
import { NotificationPushService } from '../../notification/services/notification-push.service';
import { StorageService } from 'src/storage/storage.service';
import { MailService } from 'src/mail/mail.service';

import { ConfigService } from '@nestjs/config';

import { Role } from '../../auth/types/auth.types';

describe('TasksService', () => {
  let service: TasksService;

  const validUserId = '507f1f77bcf86cd799439011';
  const validProjectId = '507f191e810c19729de860ea';
  const validTaskId = '507f191e810c19729de860eb';
  const validWorklogId = '507f191e810c19729de860ec';

  const mockTaskModel = {
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    updateMany: jest.fn(),
    aggregate: jest.fn(),
    insertMany: jest.fn(),
  };

  const mockProjectModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
  };

  const mockUserModel = {
    findById: jest.fn(),
    find: jest.fn(),
  };

  const mockWorklogModel = {
    create: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    aggregate: jest.fn(),
  };

  const mockActivityService = {
    logTaskCreated: jest.fn(),
    logAssigneeChange: jest.fn(),
    logStatusChange: jest.fn(),
    logTaskUpdated: jest.fn(),
  };

  const mockNotificationService = {
    pushNotificationToUser: jest.fn(),
  };

  const mockStorageService = {
    uploadMultipleFiles: jest.fn(),
    deleteFile: jest.fn(),
  };

  const mockMailService = {
    sendTemplateMail: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getModelToken(Task.name),
          useValue: mockTaskModel,
        },
        {
          provide: getModelToken(Project.name),
          useValue: mockProjectModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(Worklog.name),
          useValue: mockWorklogModel,
        },
        {
          provide: ActivityService,
          useValue: mockActivityService,
        },
        {
          provide: NotificationPushService,
          useValue: mockNotificationService,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildTaskUrl', () => {
    it('should build task url', () => {
      mockConfigService.get.mockReturnValue('http://localhost:3000');

      const result = Reflect.apply(
        Reflect.get(service, 'buildTaskUrl') as (taskId: string) => string,
        service,
        [validTaskId],
      );

      expect(result).toBe(`http://localhost:3000/task/${validTaskId}`);
    });

    it('should throw if frontend url missing', () => {
      mockConfigService.get.mockReturnValue(undefined);

      expect(() =>
        Reflect.apply(
          Reflect.get(service, 'buildTaskUrl') as (taskId: string) => string,
          service,
          [validTaskId],
        ),
      ).toThrow('FRONTEND_URL is not defined');
    });
  });

  describe('checkMembership', () => {
    it('should return project for superadmin', async () => {
      const project = {
        _id: validProjectId,
      };

      mockProjectModel.findOne.mockResolvedValue(project);

      const result = await service.checkMembership(
        validUserId,
        Role.SUPERADMIN,
        validProjectId,
      );

      expect(result).toEqual(project);
    });

    it('should throw if project not found', async () => {
      mockProjectModel.findOne.mockResolvedValue(null);

      await expect(
        service.checkMembership(validUserId, Role.SUPERADMIN, validProjectId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw unauthorized if user not member', async () => {
      mockProjectModel.findOne.mockResolvedValue(null);

      await expect(
        service.checkMembership(validUserId, Role.USER, validProjectId),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('create', () => {
    it('should create task successfully', async () => {
      const dto = {
        title: 'Task 1',
        projectId: validProjectId,
      };

      const project = {
        prefix: 'TASK',
        lastKey: 1,
        save: jest.fn(),
        name: 'Project 1',
      };

      const createdTask = {
        _id: validTaskId,
        title: 'Task 1',
      };

      jest
        .spyOn(service, 'checkMembership')
        .mockResolvedValue(project as never);

      mockTaskModel.create.mockResolvedValue(createdTask);

      mockUserModel.findById.mockResolvedValue({
        name: 'John',
      });

      const result = await service.create(validUserId, Role.USER, dto as never);

      expect(mockTaskModel.create).toHaveBeenCalled();

      expect(mockActivityService.logTaskCreated).toHaveBeenCalled();

      expect(result).toEqual(createdTask);
    });

    it('should upload files if files exist', async () => {
      const dto = {
        title: 'Task 1',
        projectId: validProjectId,
      };

      const files = [
        {
          originalname: 'test.png',
        },
      ];

      const project = {
        prefix: 'TASK',
        lastKey: 1,
        save: jest.fn(),
      };

      jest
        .spyOn(service, 'checkMembership')
        .mockResolvedValue(project as never);

      mockStorageService.uploadMultipleFiles.mockResolvedValue([
        {
          key: 'file-1',
        },
      ]);

      mockTaskModel.create.mockResolvedValue({
        _id: validTaskId,
      });

      await service.create(
        validUserId,
        Role.USER,
        dto as never,
        files as never,
      );

      expect(mockStorageService.uploadMultipleFiles).toHaveBeenCalledWith(
        files,
      );
    });
  });

  describe('findOne', () => {
    it('should return task', async () => {
      const task = {
        _id: validTaskId,
        projectId: validProjectId,
      };

      const populateMock = jest.fn();

      populateMock
        .mockReturnValueOnce({
          populate: populateMock,
        })
        .mockReturnValueOnce({
          populate: populateMock,
        })
        .mockReturnValueOnce({
          populate: populateMock,
        })
        .mockReturnValueOnce({
          populate: populateMock,
        })
        .mockReturnValueOnce({
          populate: populateMock,
        })
        .mockResolvedValueOnce(task);

      mockTaskModel.findById.mockReturnValue({
        populate: populateMock,
      });

      mockProjectModel.findOne.mockResolvedValue({
        _id: validProjectId,
      });

      const result = await service.findOne(validUserId, Role.USER, validTaskId);

      expect(result).toEqual(task);
    });

    it('should throw if task not found', async () => {
      const populateMock = jest.fn();

      populateMock
        .mockReturnValueOnce({
          populate: populateMock,
        })
        .mockReturnValueOnce({
          populate: populateMock,
        })
        .mockReturnValueOnce({
          populate: populateMock,
        })
        .mockReturnValueOnce({
          populate: populateMock,
        })
        .mockReturnValueOnce({
          populate: populateMock,
        })
        .mockResolvedValueOnce(null);

      mockTaskModel.findById.mockReturnValue({
        populate: populateMock,
      });

      await expect(
        service.findOne(validUserId, Role.USER, validTaskId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete task', async () => {
      const task = {
        _id: validTaskId,
        title: 'Task',
        projectId: validProjectId,
        reporter: {
          toString: () => validUserId,
        },
      };

      mockTaskModel.findById.mockResolvedValue(task);

      jest.spyOn(service, 'checkMembership').mockResolvedValue({} as never);

      const deletedTask = {
        _id: validTaskId,
      };

      const populateMock = jest.fn();

      populateMock
        .mockReturnValueOnce({
          populate: populateMock,
        })
        .mockResolvedValueOnce(deletedTask);

      mockTaskModel.findByIdAndDelete.mockReturnValue({
        populate: populateMock,
      });

      const result = await service.delete(validUserId, Role.USER, validTaskId);

      expect(result).toEqual(deletedTask);
    });
  });

  describe('startTimer', () => {
    it('should create worklog', async () => {
      const task = {
        _id: validTaskId,
        projectId: validProjectId,
      };

      mockTaskModel.findById.mockResolvedValue(task);

      jest.spyOn(service, 'checkMembership').mockResolvedValue({} as never);

      const worklog = {
        _id: validWorklogId,
      };

      mockWorklogModel.create.mockResolvedValue(worklog);

      const result = await service.startTimer(
        validUserId,
        Role.USER,
        validTaskId,
      );

      expect(mockWorklogModel.create).toHaveBeenCalled();

      expect(result).toEqual(worklog);
    });

    it('should throw if task not found', async () => {
      mockTaskModel.findById.mockResolvedValue(null);

      await expect(
        service.startTimer(validUserId, Role.USER, validTaskId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('stopTimer', () => {
    it('should stop timer', async () => {
      const save = jest.fn();

      const worklog = {
        _id: validWorklogId,
        userId: {
          toString: () => validUserId,
        },
        taskId: validTaskId,
        save,
      };

      mockWorklogModel.findById.mockResolvedValue(worklog);

      mockTaskModel.findById.mockResolvedValue({
        _id: validTaskId,
        projectId: validProjectId,
      });

      jest.spyOn(service, 'checkMembership').mockResolvedValue({} as never);

      const result = await service.stopTimer(
        validUserId,
        Role.USER,
        validWorklogId,
      );

      expect(save).toHaveBeenCalled();

      expect(result).toEqual(worklog);
    });

    it('should throw unauthorized if different user', async () => {
      mockWorklogModel.findById.mockResolvedValue({
        userId: {
          toString: () => 'another-user',
        },
      });

      await expect(
        service.stopTimer(validUserId, Role.USER, validWorklogId),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getTotalTimeTracked', () => {
    it('should return tracking summary', async () => {
      mockTaskModel.findById.mockResolvedValue({
        _id: validTaskId,
        projectId: validProjectId,
      });

      jest.spyOn(service, 'checkMembership').mockResolvedValue({} as never);

      mockWorklogModel.aggregate.mockResolvedValue([
        {
          totalTrackedMs: 60000,
          totalEntries: 2,
          completedEntries: 1,
        },
      ]);

      const result = await service.getTotalTimeTracked(
        validUserId,
        Role.USER,
        validTaskId,
      );

      expect(result).toEqual({
        taskId: validTaskId,
        totalTrackedMs: 60000,
        totalTrackedSeconds: 60,
        totalTrackedMinutes: 1,
        totalEntries: 2,
        completedEntries: 1,
      });
    });
  });

  describe('importTasksFromCsv', () => {
    it('should throw if file missing', async () => {
      await expect(
        service.importTasksFromCsv(validUserId, Role.USER, validProjectId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if file empty', async () => {
      const file = {
        buffer: Buffer.from(''),
      };

      await expect(
        service.importTasksFromCsv(
          validUserId,
          Role.USER,
          validProjectId,
          file as never,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

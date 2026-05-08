/// <reference types="jest" />

jest.mock('src/middlewares/isAuthenticated', () => ({
  IsAuthenticated: class IsAuthenticated {
    canActivate(): boolean {
      return true;
    }
  },
}));

jest.mock('../tasks.service', () => ({
  TasksService: class TasksService {
    create = jest.fn();
    importTasksFromCsv = jest.fn();
    getStats = jest.fn();
    findAll = jest.fn();
    findOne = jest.fn();
    update = jest.fn();
    delete = jest.fn();
    startTimer = jest.fn();
    stopTimer = jest.fn();
    getTotalTimeTracked = jest.fn();
    getWorklogsForTask = jest.fn();
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from '../tasks.controller';
import { TasksService } from '../tasks.service';
import { Role } from 'src/modules/auth/types/auth.types';

describe('TasksController', () => {
  let controller: TasksController;

  const tasksService = {
    create: jest.fn(),
    importTasksFromCsv: jest.fn(),
    getStats: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    startTimer: jest.fn(),
    stopTimer: jest.fn(),
    getTotalTimeTracked: jest.fn(),
    getWorklogsForTask: jest.fn(),
  };

  const req = {
    user: {
      _id: 'user-1',
      role: Role.USER,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [{ provide: TasksService, useValue: tasksService }],
    }).compile();

    controller = module.get<TasksController>(TasksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate to service and return wrapped response', async () => {
      const dto = {
        title: 'Task 1',
      };

      const files = [
        {
          originalname: 'file1.png',
        },
      ];

      tasksService.create.mockResolvedValue({
        _id: 'task-1',
      });

      const result = await controller.create(
        req as never,
        dto as never,
        files as never,
      );

      expect(tasksService.create).toHaveBeenCalledWith(
        req.user._id,
        req.user.role,
        dto,
        files,
      );

      expect(result).toEqual({
        success: true,
        result: {
          _id: 'task-1',
        },
      });
    });
  });

  describe('importTasksFromCsv', () => {
    it('should import csv successfully', async () => {
      const file = {
        originalname: 'tasks.csv',
      };

      tasksService.importTasksFromCsv.mockResolvedValue({
        imported: 10,
      });

      const result = await controller.importTasksFromCsv(
        'project-1',
        req as never,
        file as never,
      );

      expect(tasksService.importTasksFromCsv).toHaveBeenCalledWith(
        req.user._id,
        req.user.role,
        'project-1',
        file,
      );

      expect(result).toEqual({
        success: true,
        result: {
          imported: 10,
        },
      });
    });
  });

  describe('getStats', () => {
    it('should return stats', async () => {
      tasksService.getStats.mockResolvedValue({
        total: 20,
      });

      const result = await controller.getStats(req as never);

      expect(tasksService.getStats).toHaveBeenCalledWith(req.user._id);

      expect(result).toEqual({
        success: true,
        result: {
          total: 20,
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return all tasks', async () => {
      const query = {
        search: 'task',
      };

      tasksService.findAll.mockResolvedValue([{ _id: 'task-1' }]);

      const result = await controller.findAll(req as never, query as never);

      expect(tasksService.findAll).toHaveBeenCalledWith(
        req.user._id,
        req.user.role,
        query,
      );

      expect(result).toEqual({
        success: true,
        result: [{ _id: 'task-1' }],
      });
    });
  });

  describe('findOne', () => {
    it('should return single task', async () => {
      tasksService.findOne.mockResolvedValue({
        _id: 'task-1',
      });

      const result = await controller.findOne('task-1', req as never);

      expect(tasksService.findOne).toHaveBeenCalledWith(
        req.user._id,
        req.user.role,
        'task-1',
      );

      expect(result).toEqual({
        success: true,
        result: {
          _id: 'task-1',
        },
      });
    });
  });

  describe('update', () => {
    it('should update task', async () => {
      const dto = {
        title: 'Updated Task',
      };

      const files = [
        {
          originalname: 'updated.png',
        },
      ];

      tasksService.update.mockResolvedValue({
        _id: 'task-1',
      });

      const result = await controller.update(
        'task-1',
        dto as never,
        req as never,
        files as never,
      );

      expect(tasksService.update).toHaveBeenCalledWith(
        req.user._id,
        req.user.role,
        'task-1',
        dto,
        files,
      );

      expect(result).toEqual({
        success: true,
        result: {
          _id: 'task-1',
        },
      });
    });
  });

  describe('remove', () => {
    it('should delete task', async () => {
      tasksService.delete.mockResolvedValue({
        _id: 'task-1',
      });

      const result = await controller.remove('task-1', req as never);

      expect(tasksService.delete).toHaveBeenCalledWith(
        req.user._id,
        req.user.role,
        'task-1',
      );

      expect(result).toEqual({
        success: true,
        result: {
          _id: 'task-1',
        },
      });
    });
  });

  describe('startTimer', () => {
    it('should start timer', async () => {
      tasksService.startTimer.mockResolvedValue({
        started: true,
      });

      const result = await controller.startTimer('task-1', req as never);

      expect(tasksService.startTimer).toHaveBeenCalledWith(
        req.user._id,
        req.user.role,
        'task-1',
      );

      expect(result).toEqual({
        success: true,
        result: {
          started: true,
        },
      });
    });
  });

  describe('getTotalTimeTracked', () => {
    it('should return tracked time', async () => {
      tasksService.getTotalTimeTracked.mockResolvedValue({
        totalSeconds: 5000,
      });

      const result = await controller.getTotalTimeTracked(
        'task-1',
        req as never,
      );

      expect(tasksService.getTotalTimeTracked).toHaveBeenCalledWith(
        req.user._id,
        req.user.role,
        'task-1',
      );

      expect(result).toEqual({
        success: true,
        result: {
          totalSeconds: 5000,
        },
      });
    });
  });

  describe('stopTimer', () => {
    it('should stop timer', async () => {
      tasksService.stopTimer.mockResolvedValue({
        stopped: true,
      });

      const result = await controller.stopTimer('worklog-1', req as never);

      expect(tasksService.stopTimer).toHaveBeenCalledWith(
        req.user._id,
        req.user.role,
        'worklog-1',
      );

      expect(result).toEqual({
        success: true,
        result: {
          stopped: true,
        },
      });
    });
  });

  describe('getWorklogs', () => {
    it('should return worklogs', async () => {
      tasksService.getWorklogsForTask.mockResolvedValue([
        {
          _id: 'worklog-1',
        },
      ]);

      const result = await controller.getWorklogs('task-1', req as never);

      expect(tasksService.getWorklogsForTask).toHaveBeenCalledWith(
        req.user._id,
        req.user.role,
        'task-1',
      );

      expect(result).toEqual({
        success: true,
        result: [
          {
            _id: 'worklog-1',
          },
        ],
      });
    });
  });
});

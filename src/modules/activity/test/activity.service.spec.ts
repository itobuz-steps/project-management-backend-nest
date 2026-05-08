/// <reference types="jest" />

jest.mock('../schemas/activity.schemas', () => ({
  Activity: class Activity {},
}));

jest.mock('src/modules/auth/schemas/user.schema', () => ({
  User: class User {},
}));

jest.mock('src/modules/tasks/entities/task.entity', () => ({
  Task: class Task {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ActivityService } from '../services/activity.service';
import { ActivityAction } from '../type/activity.types';

describe('ActivityService', () => {
  let service: ActivityService;

  const activityModel = {
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  };

  const userModel = {
    findById: jest.fn(),
  };

  const taskModel = {
    aggregate: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        { provide: getModelToken('Activity'), useValue: activityModel },
        { provide: getModelToken('User'), useValue: userModel },
        { provide: getModelToken('Task'), useValue: taskModel },
      ],
    }).compile();

    service = module.get<ActivityService>(ActivityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('logTaskCreated should create TASK_CREATED activity', async () => {
    let createPayload:
      | {
          action: ActivityAction;
          task: Types.ObjectId;
          byUser: Types.ObjectId;
          updatedFields: { title: { from: string; to: string } };
        }
      | undefined;
    activityModel.create.mockImplementation(
      (payload: {
        action: ActivityAction;
        task: Types.ObjectId;
        byUser: Types.ObjectId;
        updatedFields: { title: { from: string; to: string } };
      }) => {
        createPayload = payload;
        return Promise.resolve({ _id: new Types.ObjectId() });
      },
    );

    await service.logTaskCreated({
      taskId: new Types.ObjectId().toString(),
      byUserId: new Types.ObjectId().toString(),
      taskTitle: 'Implement timeline API',
    });

    if (!createPayload) {
      throw new Error('Expected create payload to be defined');
    }
    expect(createPayload.action).toBe(ActivityAction.TASK_CREATED);
    expect(createPayload.task).toBeInstanceOf(Types.ObjectId);
    expect(createPayload.byUser).toBeInstanceOf(Types.ObjectId);
    expect(createPayload.updatedFields).toEqual({
      title: { from: '', to: 'Implement timeline API' },
    });
  });

  it('logTaskUpdated should normalize dueDate values', async () => {
    activityModel.create.mockResolvedValue({ _id: new Types.ObjectId() });

    await service.logTaskUpdated({
      taskId: new Types.ObjectId().toString(),
      byUserId: new Types.ObjectId().toString(),
      changes: [
        {
          field: 'dueDate',
          oldValue: '2026-01-01T00:00:00.000Z',
          newValue: '2026-01-08T00:00:00.000Z',
        },
      ],
    });

    expect(activityModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: ActivityAction.TASK_UPDATED,
        updatedFields: {
          dueDate: {
            from: new Date('2026-01-01T00:00:00.000Z').toDateString(),
            to: new Date('2026-01-08T00:00:00.000Z').toDateString(),
          },
        },
      }),
    );
  });

  it('logAssigneeChange should save assignee name when new assignee exists', async () => {
    let createPayload:
      | {
          action: ActivityAction;
          targetUser: Types.ObjectId;
          updatedFields: { assignee: { to: string } };
        }
      | undefined;
    activityModel.create.mockImplementation(
      (payload: {
        action: ActivityAction;
        targetUser: Types.ObjectId;
        updatedFields: { assignee: { to: string } };
      }) => {
        createPayload = payload;
        return Promise.resolve({ _id: new Types.ObjectId() });
      },
    );
    userModel.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ name: 'John Doe' }),
    });

    await service.logAssigneeChange({
      taskId: new Types.ObjectId().toString(),
      byUserId: new Types.ObjectId().toString(),
      newAssigneeId: new Types.ObjectId().toString(),
    });

    if (!createPayload) {
      throw new Error('Expected create payload to be defined');
    }
    expect(createPayload.action).toBe(ActivityAction.ASSIGNEE_CHANGED);
    expect(createPayload.targetUser).toBeInstanceOf(Types.ObjectId);
    expect(createPayload.updatedFields).toEqual({
      assignee: { to: 'John Doe' },
    });
  });

  it('logAssigneeChange should clear assignee when no new assignee provided', async () => {
    activityModel.create.mockResolvedValue({ _id: new Types.ObjectId() });

    await service.logAssigneeChange({
      taskId: new Types.ObjectId().toString(),
      byUserId: new Types.ObjectId().toString(),
      newAssigneeId: null,
    });

    expect(userModel.findById).not.toHaveBeenCalled();
    expect(activityModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: ActivityAction.ASSIGNEE_CHANGED,
        updatedFields: { assignee: { to: '' } },
      }),
    );
  });

  it('getTaskTimeline should return paginated timeline and total', async () => {
    const activities = [{ action: ActivityAction.TASK_CREATED }];

    const findExecMock = jest.fn().mockResolvedValue(activities);
    const findLimitMock = jest.fn().mockReturnValue({ exec: findExecMock });
    const findSkipMock = jest.fn().mockReturnValue({ limit: findLimitMock });
    const findSortMock = jest.fn().mockReturnValue({ skip: findSkipMock });
    const findPopulateTargetMock = jest
      .fn()
      .mockReturnValue({ sort: findSortMock });
    const findPopulateByUserMock = jest
      .fn()
      .mockReturnValue({ populate: findPopulateTargetMock });

    activityModel.find.mockReturnValue({ populate: findPopulateByUserMock });
    activityModel.countDocuments.mockResolvedValue(1);

    const result = await service.getTaskTimeline(
      new Types.ObjectId().toString(),
      1,
      20,
    );

    expect(result).toEqual({ activities, total: 1 });
    expect(activityModel.find).toHaveBeenCalledTimes(1);
    expect(activityModel.countDocuments).toHaveBeenCalledTimes(1);
  });

  it('getProjectActivities should apply pagination and return totals', async () => {
    const aggregatedActivities = [
      {
        action: ActivityAction.PROJECT_CREATED,
        byUser: {
          _id: new Types.ObjectId(),
          name: 'Tester',
          profileImage: 'img',
        },
        createdAt: new Date(),
      },
    ];

    let firstAggregatePipeline: Array<Record<string, unknown>> = [];
    activityModel.aggregate
      .mockImplementationOnce((pipeline: Array<Record<string, unknown>>) => {
        firstAggregatePipeline = pipeline;
        return Promise.resolve(aggregatedActivities);
      })
      .mockResolvedValueOnce([{ total: 15 }]);

    const result = await service.getProjectActivities(
      new Types.ObjectId().toString(),
      {
        page: 2,
        limit: 10,
      },
    );

    expect(result).toEqual({
      activities: aggregatedActivities,
      total: 15,
      page: 2,
      totalPages: 2,
    });

    expect(firstAggregatePipeline).toEqual(
      expect.arrayContaining([{ $skip: 10 }, { $limit: 10 }]),
    );
  });
});

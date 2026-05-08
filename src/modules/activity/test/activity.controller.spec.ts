/// <reference types="jest" />

jest.mock('../services/activity.service', () => ({
  ActivityService: class ActivityService {
    getAllActivities = jest.fn();
    getTaskTimelineByAction = jest.fn();
    getTaskTimeline = jest.fn();
    getProjectActivities = jest.fn();
    exportProjectActivities = jest.fn();
    getProjectAnalytics = jest.fn();
  },
}));

jest.mock('src/middlewares/isAuthenticated', () => ({
  IsAuthenticated: class IsAuthenticated {
    canActivate(): boolean {
      return true;
    }
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ActivityController } from '../activity.controller';
import { ActivityService } from '../services/activity.service';
import { ActivityAction } from '../type/activity.types';

describe('ActivityController', () => {
  let controller: ActivityController;

  const activityService = {
    getAllActivities: jest.fn(),
    getTaskTimelineByAction: jest.fn(),
    getTaskTimeline: jest.fn(),
    getProjectActivities: jest.fn(),
    exportProjectActivities: jest.fn(),
    getProjectAnalytics: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivityController],
      providers: [{ provide: ActivityService, useValue: activityService }],
    }).compile();

    controller = module.get<ActivityController>(ActivityController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getAllActivities should pass numeric page and limit to service', async () => {
    activityService.getAllActivities.mockResolvedValue({
      activities: [],
      total: 0,
    });

    await controller.getAllActivities(
      '2' as unknown as number,
      '15' as unknown as number,
      ActivityAction.TASK_CREATED,
    );

    expect(activityService.getAllActivities).toHaveBeenCalledWith(2, 15, {
      action: ActivityAction.TASK_CREATED,
    });
  });

  it('getTaskTimeline should return action-filtered timeline when action exists', async () => {
    activityService.getTaskTimelineByAction.mockResolvedValue([
      { action: ActivityAction.COMMENT_ADDED },
    ]);

    const result = await controller.getTaskTimeline(
      'task-1',
      1,
      20,
      ActivityAction.COMMENT_ADDED,
    );

    expect(activityService.getTaskTimelineByAction).toHaveBeenCalledWith(
      'task-1',
      ActivityAction.COMMENT_ADDED,
    );
    expect(result).toEqual({
      activities: [{ action: ActivityAction.COMMENT_ADDED }],
      total: 1,
    });
  });

  it('getTaskTimeline should return paginated timeline when no action is provided', async () => {
    activityService.getTaskTimeline.mockResolvedValue({
      activities: [],
      total: 0,
    });

    await controller.getTaskTimeline(
      'task-1',
      '3' as unknown as number,
      '5' as unknown as number,
    );

    expect(activityService.getTaskTimeline).toHaveBeenCalledWith(
      'task-1',
      3,
      5,
    );
  });

  it('getProjectActivities should delegate to service', async () => {
    const body = {
      page: 1,
      limit: 10,
      actions: [ActivityAction.PROJECT_CREATED],
    };
    activityService.getProjectActivities.mockResolvedValue({
      activities: [],
      total: 0,
      page: 1,
      totalPages: 0,
    });

    await controller.getProjectActivities('project-1', body);

    expect(activityService.getProjectActivities).toHaveBeenCalledWith(
      'project-1',
      body,
    );
  });

  it('exportProjectActivities should delegate to service', async () => {
    const consoleSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);
    const body = { page: 1, limit: 10 };
    activityService.exportProjectActivities.mockResolvedValue({
      activities: [],
    });

    await controller.exportProjectActivities('project-1', body);

    expect(activityService.exportProjectActivities).toHaveBeenCalledWith(
      'project-1',
      body,
    );
    consoleSpy.mockRestore();
  });

  it('getProjectAnalytics should delegate to service', async () => {
    activityService.getProjectAnalytics.mockResolvedValue({
      statusOverview: [],
      priorityBreakdown: [],
      typesOfWork: [],
      teamWorkload: [],
      epicProgress: [],
      recentActivity: [],
    });

    await controller.getProjectAnalytics('project-1');

    expect(activityService.getProjectAnalytics).toHaveBeenCalledWith(
      'project-1',
    );
  });
});

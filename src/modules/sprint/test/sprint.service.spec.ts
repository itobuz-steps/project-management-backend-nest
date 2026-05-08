/// <reference types="jest" />

jest.mock('../schema/sprint.schema', () => ({
  Sprint: class Sprint {},
}));

jest.mock('../../tasks/entities/task.entity', () => ({
  Task: class Task {},
}));

jest.mock('../../activity/schemas/activity.schemas', () => ({
  Activity: class Activity {},
}));

jest.mock('../../project/schema/project.schema', () => ({
  Project: class Project {},
}));

jest.mock('../../auth/schemas/user.schema', () => ({
  User: class User {},
}));

jest.mock('src/utils/project-access.util', () => ({
  getProjectWithAccess: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SprintService } from '../sprint.service';
import { NotificationPushService } from '../../notification/services/notification-push.service';
import { MailService } from 'src/mail/mail.service';
import { ActivityService } from '../../activity/services/activity.service';
import { ProjectType } from '../../project/type/project.types';
import { getProjectWithAccess } from 'src/utils/project-access.util';

class SprintModelMock {
  static find = jest.fn();
  static findById = jest.fn();
  static findByIdAndUpdate = jest.fn();

  save = jest.fn();
  deleteOne = jest.fn();
  _id: Types.ObjectId;

  constructor(data: Record<string, unknown>) {
    Object.assign(this, data);
    this._id = new Types.ObjectId();
    this.save.mockResolvedValue(this);
    this.deleteOne.mockResolvedValue(undefined);
  }
}

describe('SprintService', () => {
  let service: SprintService;
  let consoleErrorSpy: jest.SpyInstance;

  const projectModel = {
    findById: jest.fn(),
  };

  const userModel = {
    find: jest.fn(),
  };

  const taskModel = {
    find: jest.fn(),
    aggregate: jest.fn(),
  };

  const activityModel = {
    find: jest.fn(),
  };

  const mailService = {
    sendTemplateMail: jest.fn(),
  };

  const notificationPushService = {
    pushNotificationToProjectMembers: jest.fn(),
  };

  const activityService = {
    logRemovedFromSprint: jest.fn(),
  };

  const configService = {
    get: jest.fn(),
  };

  const mockedGetProjectWithAccess = getProjectWithAccess as jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SprintService,
        { provide: getModelToken('Sprint'), useValue: SprintModelMock },
        { provide: getModelToken('Project'), useValue: projectModel },
        { provide: getModelToken('User'), useValue: userModel },
        { provide: getModelToken('Task'), useValue: taskModel },
        { provide: getModelToken('Activity'), useValue: activityModel },
        { provide: MailService, useValue: mailService },
        {
          provide: NotificationPushService,
          useValue: notificationPushService,
        },
        { provide: ActivityService, useValue: activityService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<SprintService>(SprintService);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('buildProjectUrl should return backlog url', () => {
    configService.get.mockReturnValue('http://localhost:3000');

    const result = Reflect.apply(
      Reflect.get(service, 'buildProjectUrl') as (projectId: string) => string,
      service,
      ['project-1'],
    );

    expect(result).toBe('http://localhost:3000/project/project-1/backlog');
  });

  it('buildProjectUrl should throw when FRONTEND_URL is missing', () => {
    configService.get.mockReturnValue(undefined);

    expect(() =>
      Reflect.apply(
        Reflect.get(service, 'buildProjectUrl') as (
          projectId: string,
        ) => string,
        service,
        ['project-1'],
      ),
    ).toThrow('FRONTEND_URL is not defined');
  });

  it('getSprintById should throw if sprint does not exist', async () => {
    SprintModelMock.findById.mockResolvedValue(null);

    await expect(
      service.getSprintById({
        userId: 'user-1',
        sprintId: 'sprint-1',
        role: 'user' as never,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getSprintById should throw if project access fails', async () => {
    const sprint = {
      _id: new Types.ObjectId(),
      projectId: new Types.ObjectId(),
    };

    SprintModelMock.findById.mockResolvedValue(sprint);
    mockedGetProjectWithAccess.mockResolvedValue(null);

    await expect(
      service.getSprintById({
        userId: 'user-1',
        sprintId: 'sprint-1',
        role: 'user' as never,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('getSprintsByProjectId should return sorted sprints', async () => {
    mockedGetProjectWithAccess.mockResolvedValue({ _id: 'project-1' });

    const sortMock = jest.fn().mockResolvedValue([{ _id: 'sprint-1' }]);
    SprintModelMock.find.mockReturnValue({ sort: sortMock });

    const result = await service.getSprintsByProjectId({
      userId: 'user-1',
      projectId: 'project-1',
      role: 'user' as never,
    });

    expect(SprintModelMock.find).toHaveBeenCalledWith({
      projectId: 'project-1',
    });
    expect(sortMock).toHaveBeenCalledWith({ startDate: 1, createdAt: 1 });
    expect(result).toEqual([{ _id: 'sprint-1' }]);
  });

  it('createSprint should reject kanban projects', async () => {
    mockedGetProjectWithAccess.mockResolvedValue({
      _id: new Types.ObjectId(),
      projectType: ProjectType.KANBAN,
    });

    await expect(
      service.createSprint({ title: 'Sprint 1' } as never, {
        userId: 'user-1',
        projectId: 'project-1',
        role: 'user' as never,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('createSprint should create sprint and increment project sprintCount', async () => {
    const project = {
      _id: new Types.ObjectId(),
      projectType: ProjectType.SCRUM,
      prefix: 'PROJ',
      sprintCount: 2,
      name: 'Project',
      members: [],
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockedGetProjectWithAccess.mockResolvedValue(project);
    configService.get.mockReturnValue('http://localhost:3000');

    const result = await service.createSprint(
      {
        title: 'Sprint 3',
        storyPoint: 10,
      } as never,
      {
        userId: 'user-1',
        projectId: 'project-1',
        role: 'admin' as never,
      },
    );

    expect(result).toBeDefined();
    expect((result as never as { key: string }).key).toBe('PROJ-sprint-3');
    expect(project.sprintCount).toBe(3);
    expect(project.save).toHaveBeenCalledTimes(1);
  });

  it('removeTaskFromSprint should update sprint and log activity', async () => {
    const sprint = {
      _id: new Types.ObjectId(),
      key: 'PROJ-sprint-1',
    };
    SprintModelMock.findById.mockResolvedValue(sprint);
    SprintModelMock.findByIdAndUpdate.mockResolvedValue(sprint);

    mockedGetProjectWithAccess.mockResolvedValue({
      _id: new Types.ObjectId(),
      name: 'Project',
      members: [],
    });
    configService.get.mockReturnValue('http://localhost:3000');

    const result = await service.removeTaskFromSprint('task-1', {
      userId: 'user-1',
      projectId: 'project-1',
      sprintId: 'sprint-1',
      role: 'admin' as never,
    });

    expect(SprintModelMock.findByIdAndUpdate).toHaveBeenCalledWith(
      'sprint-1',
      { $pull: { tasks: 'task-1' } },
      { new: true },
    );
    expect(activityService.logRemovedFromSprint).toHaveBeenCalledWith({
      taskId: 'task-1',
      byUserId: 'user-1',
      sprintId: sprint._id,
    });
    expect(result).toEqual(sprint);
  });

  it('getTasksRemovedDuringSprint should throw if sprint not completed', async () => {
    SprintModelMock.findById.mockResolvedValue({
      _id: new Types.ObjectId(),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      endDate: null,
    });

    await expect(
      service.getTasksRemovedDuringSprint('sprint-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('getTasksRemovedDuringSprint should return removed tasks not in sprint anymore', async () => {
    const removedTaskId = new Types.ObjectId();
    SprintModelMock.findById.mockResolvedValue({
      _id: new Types.ObjectId(),
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-01-10T00:00:00.000Z'),
      tasks: [new Types.ObjectId()],
    });

    activityModel.find.mockResolvedValue([{ task: { _id: removedTaskId } }]);
    taskModel.find.mockResolvedValue([{ _id: removedTaskId, title: 'Task 1' }]);

    const result = await service.getTasksRemovedDuringSprint('sprint-1');

    expect(taskModel.find).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ _id: removedTaskId, title: 'Task 1' }]);
  });

  it('getSprintCompletionSummary should split completed and pending tasks', async () => {
    const doneTaskId = new Types.ObjectId();
    const todoTaskId = new Types.ObjectId();

    SprintModelMock.findById.mockResolvedValue({
      _id: new Types.ObjectId(),
      isCompleted: true,
      taskStatusesAtCompletion: new Map([
        [doneTaskId.toString(), 'done'],
        [todoTaskId.toString(), 'todo'],
      ]),
    });

    projectModel.findById.mockResolvedValue({
      _id: new Types.ObjectId(),
      columns: ['todo', 'in-progress', 'done'],
    });

    taskModel.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { _id: doneTaskId, title: 'Done Task' },
        { _id: todoTaskId, title: 'Todo Task' },
      ]),
    });

    const result = await service.getSprintCompletionSummary(
      'sprint-1',
      'project-1',
    );

    expect(result).toEqual({
      completed: [{ _id: doneTaskId, title: 'Done Task' }],
      pending: [{ _id: todoTaskId, title: 'Todo Task' }],
    });
  });

  it('getBurndown should throw if sprint is missing', async () => {
    SprintModelMock.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });

    await expect(service.getBurndown('sprint-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('getBurndown should return chart payload for started sprint', async () => {
    const doneTaskId = new Types.ObjectId();

    SprintModelMock.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(),
        key: 'PROJ-sprint-1',
        startDate: new Date('2026-01-05T00:00:00.000Z'),
        dueDate: new Date('2026-01-06T00:00:00.000Z'),
        storyPoint: 10,
        tasks: [doneTaskId],
        taskStatusesAtCompletion: {
          [doneTaskId.toString()]: 'done',
        },
      }),
    });

    taskModel.aggregate
      .mockResolvedValueOnce([{ _id: '05-01-2026', points: 4 }])
      .mockResolvedValueOnce([{ _id: '06-01-2026', points: 2 }]);

    const result = await service.getBurndown('sprint-1');

    expect(result.sprint.id).toBe('sprint-1');
    expect(Array.isArray(result.series)).toBe(true);
    expect(Array.isArray(result.scopeChanges)).toBe(true);
    expect(result.summary.currentScope).toBe(12);
  });
});

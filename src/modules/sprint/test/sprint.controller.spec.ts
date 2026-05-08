/// <reference types="jest" />

jest.mock('src/middlewares/isAuthenticated', () => ({
  IsAuthenticated: class IsAuthenticated {
    canActivate(): boolean {
      return true;
    }
  },
}));

jest.mock('src/common/decorators/roles.decorator', () => ({
  Roles: () => () => undefined,
}));

jest.mock('../sprint.service', () => ({
  SprintService: class SprintService {
    getSprintsByProjectId = jest.fn();
    getSprintById = jest.fn();
    createSprint = jest.fn();
    updateSprint = jest.fn();
    deleteSprint = jest.fn();
    addTasksIntoSprint = jest.fn();
    removeTaskFromSprint = jest.fn();
    getSprintCompletionSummary = jest.fn();
    getTasksRemovedDuringSprint = jest.fn();
    getBurndown = jest.fn();
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { SprintController } from '../sprint.controller';
import { SprintService } from '../sprint.service';
import { Role } from 'src/modules/auth/types/auth.types';

describe('SprintController', () => {
  let controller: SprintController;

  const sprintService = {
    getSprintsByProjectId: jest.fn(),
    getSprintById: jest.fn(),
    createSprint: jest.fn(),
    updateSprint: jest.fn(),
    deleteSprint: jest.fn(),
    addTasksIntoSprint: jest.fn(),
    removeTaskFromSprint: jest.fn(),
    getSprintCompletionSummary: jest.fn(),
    getTasksRemovedDuringSprint: jest.fn(),
    getBurndown: jest.fn(),
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
      controllers: [SprintController],
      providers: [{ provide: SprintService, useValue: sprintService }],
    }).compile();

    controller = module.get<SprintController>(SprintController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getAllSprints should delegate to service and wrap response', async () => {
    sprintService.getSprintsByProjectId.mockResolvedValue([
      { _id: 'sprint-1' },
    ]);

    const result = await controller.getAllSprints(req as never, 'project-1');

    expect(sprintService.getSprintsByProjectId).toHaveBeenCalledWith({
      userId: req.user._id,
      projectId: 'project-1',
      role: req.user.role,
    });
    expect(result).toEqual({ success: true, result: [{ _id: 'sprint-1' }] });
  });

  it('getSprintById should delegate to service and wrap response', async () => {
    sprintService.getSprintById.mockResolvedValue({ _id: 'sprint-1' });

    const result = await controller.getSprintById(req as never, 'sprint-1');

    expect(sprintService.getSprintById).toHaveBeenCalledWith({
      userId: req.user._id,
      sprintId: 'sprint-1',
      role: req.user.role,
    });
    expect(result).toEqual({ success: true, result: { _id: 'sprint-1' } });
  });

  it('createSprint should delegate to service and include success message', async () => {
    const dto = { title: 'Sprint 1' };
    sprintService.createSprint.mockResolvedValue({ _id: 'sprint-1' });

    const result = await controller.createSprint(
      req as never,
      dto as never,
      'project-1',
    );

    expect(sprintService.createSprint).toHaveBeenCalledWith(dto, {
      userId: req.user._id,
      projectId: 'project-1',
      role: req.user.role,
    });
    expect(result).toEqual({
      success: true,
      result: { _id: 'sprint-1' },
      message: 'Sprint created successfully',
    });
  });

  it('updateSprint should delegate to service and include success message', async () => {
    const dto = { title: 'Renamed Sprint' };
    sprintService.updateSprint.mockResolvedValue({ _id: 'sprint-1' });

    const result = await controller.updateSprint(
      req as never,
      'sprint-1',
      dto as never,
      'project-1',
    );

    expect(sprintService.updateSprint).toHaveBeenCalledWith(dto, {
      userId: req.user._id,
      projectId: 'project-1',
      sprintId: 'sprint-1',
      role: req.user.role,
    });
    expect(result).toEqual({
      success: true,
      result: { _id: 'sprint-1' },
      message: 'Sprint updated successfully',
    });
  });

  it('deleteSprint should delegate to service and include success message', async () => {
    sprintService.deleteSprint.mockResolvedValue({ _id: 'sprint-1' });

    const result = await controller.deleteSprint(
      req as never,
      'sprint-1',
      'project-1',
    );

    expect(sprintService.deleteSprint).toHaveBeenCalledWith({
      userId: req.user._id,
      projectId: 'project-1',
      sprintId: 'sprint-1',
      role: req.user.role,
    });
    expect(result).toEqual({
      success: true,
      result: { _id: 'sprint-1' },
      message: 'Sprint successfully deleted',
    });
  });

  it('addTasksIntoSprint should delegate to service and include success message', async () => {
    const dto = { tasks: ['task-1', 'task-2'] };
    sprintService.addTasksIntoSprint.mockResolvedValue({ _id: 'sprint-1' });

    const result = await controller.addTasksIntoSprint(
      req as never,
      'sprint-1',
      dto as never,
      'project-1',
    );

    expect(sprintService.addTasksIntoSprint).toHaveBeenCalledWith(dto.tasks, {
      userId: req.user._id,
      projectId: 'project-1',
      sprintId: 'sprint-1',
      role: req.user.role,
    });
    expect(result).toEqual({
      success: true,
      result: { _id: 'sprint-1' },
      message: 'Tasks added into sprint successfully',
    });
  });

  it('removeTaskFromSprint should delegate to service and include success message', async () => {
    const dto = { task: 'task-1' };
    sprintService.removeTaskFromSprint.mockResolvedValue({ _id: 'sprint-1' });

    const result = await controller.removeTaskFromSprint(
      req as never,
      'sprint-1',
      dto as never,
      'project-1',
    );

    expect(sprintService.removeTaskFromSprint).toHaveBeenCalledWith(dto.task, {
      userId: req.user._id,
      projectId: 'project-1',
      sprintId: 'sprint-1',
      role: req.user.role,
    });
    expect(result).toEqual({
      success: true,
      result: { _id: 'sprint-1' },
      message: 'Sprint tasks updated successfully',
    });
  });

  it('getCompletedTasks should delegate to service and wrap response', async () => {
    sprintService.getSprintCompletionSummary.mockResolvedValue({
      completed: [{ _id: 'task-1' }],
      pending: [{ _id: 'task-2' }],
    });

    const result = await controller.getCompletedTasks(
      req as never,
      'sprint-1',
      'project-1',
    );

    expect(sprintService.getSprintCompletionSummary).toHaveBeenCalledWith(
      'sprint-1',
      'project-1',
    );
    expect(result).toEqual({
      success: true,
      result: {
        completed: [{ _id: 'task-1' }],
        pending: [{ _id: 'task-2' }],
      },
    });
  });

  it('getTasksMovedToBacklogAtSprintEnd should delegate to service and wrap response', async () => {
    sprintService.getTasksRemovedDuringSprint.mockResolvedValue([
      { _id: 'task-1' },
    ]);

    const result = await controller.getTasksMovedToBacklogAtSprintEnd(
      req as never,
      'sprint-1',
    );

    expect(sprintService.getTasksRemovedDuringSprint).toHaveBeenCalledWith(
      'sprint-1',
    );
    expect(result).toEqual({ success: true, result: [{ _id: 'task-1' }] });
  });

  it('getBurnDownChartData should delegate to service and wrap response', async () => {
    sprintService.getBurndown.mockResolvedValue({
      sprint: { id: 'sprint-1' },
      series: [],
      summary: {},
      scopeChanges: [],
    });

    const result = await controller.getBurnDownChartData(
      req as never,
      'sprint-1',
    );

    expect(sprintService.getBurndown).toHaveBeenCalledWith('sprint-1');
    expect(result).toEqual({
      success: true,
      result: {
        sprint: { id: 'sprint-1' },
        series: [],
        summary: {},
        scopeChanges: [],
      },
    });
  });
});

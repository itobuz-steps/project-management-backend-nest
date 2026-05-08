/// <reference types="jest" />

jest.mock('src/middlewares/isAuthenticated', () => ({
  IsAuthenticated: class IsAuthenticated {
    canActivate(): boolean {
      return true;
    }
  },
}));

jest.mock('../workspace.service', () => ({
  WorkspaceService: class WorkspaceService {
    create = jest.fn();
    findAll = jest.fn();
    update = jest.fn();
    delete = jest.fn();
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceController } from '../workspace.controller';
import { WorkspaceService } from '../workspace.service';
import { Role } from 'src/modules/auth/types/auth.types';

describe('WorkspaceController', () => {
  let controller: WorkspaceController;

  const workspaceService = {
    create: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const req = {
    user: {
      _id: 'user-1',
      role: Role.SUPERADMIN,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkspaceController],
      providers: [{ provide: WorkspaceService, useValue: workspaceService }],
    }).compile();

    controller = module.get<WorkspaceController>(WorkspaceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create should delegate to service and wrap response', async () => {
    const dto = { name: 'Engineering' };
    workspaceService.create.mockResolvedValue({ _id: 'workspace-1' });

    const result = await controller.create(dto as never, req as never);

    expect(workspaceService.create).toHaveBeenCalledWith(dto, req.user.role);
    expect(result).toEqual({
      success: true,
      result: { _id: 'workspace-1' },
    });
  });

  it('findAll should delegate to service and wrap response', async () => {
    workspaceService.findAll.mockResolvedValue([
      {
        workspaceId: 'workspace-1',
        workspaceName: 'Engineering',
        projects: [],
      },
    ]);

    const result = await controller.findAll(req as never);

    expect(workspaceService.findAll).toHaveBeenCalledWith(
      req.user._id,
      req.user.role,
    );
    expect(result).toEqual({
      success: true,
      result: [
        {
          workspaceId: 'workspace-1',
          workspaceName: 'Engineering',
          projects: [],
        },
      ],
    });
  });

  it('update should delegate to service and wrap response', async () => {
    const dto = { name: 'Renamed Workspace' };
    workspaceService.update.mockResolvedValue({ _id: 'workspace-1' });

    const result = await controller.update(
      'workspace-1',
      dto as never,
      req as never,
    );

    expect(workspaceService.update).toHaveBeenCalledWith(
      'workspace-1',
      dto,
      req.user.role,
    );
    expect(result).toEqual({
      success: true,
      result: { _id: 'workspace-1' },
    });
  });

  it('remove should delegate to service and wrap response', async () => {
    workspaceService.delete.mockResolvedValue({ _id: 'workspace-1' });

    const result = await controller.remove('workspace-1', req as never);

    expect(workspaceService.delete).toHaveBeenCalledWith(
      'workspace-1',
      req.user.role,
    );
    expect(result).toEqual({
      success: true,
      result: { _id: 'workspace-1' },
    });
  });
});

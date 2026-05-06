/// <reference types="jest" />

jest.mock('src/middlewares/isAuthenticated', () => ({
  IsAuthenticated: class IsAuthenticated {
    canActivate(): boolean {
      return true;
    }
  },
}));

jest.mock('../services/project.service', () => ({
  ProjectService: class ProjectService {
    getAllProjects = jest.fn();
    getProjectsByUserId = jest.fn();
    getProjectById = jest.fn();
    getUserByProjectId = jest.fn();
    createProject = jest.fn();
    updateProject = jest.fn();
    deleteProject = jest.fn();
    deleteColumn = jest.fn();
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ProjectController } from '../controllers/project.controller';
import { ProjectService } from '../services/project.service';
import { Role } from 'src/modules/auth/types/auth.types';

describe('ProjectController', () => {
  let controller: ProjectController;

  const projectService = {
    getAllProjects: jest.fn(),
    getProjectsByUserId: jest.fn(),
    getProjectById: jest.fn(),
    getUserByProjectId: jest.fn(),
    createProject: jest.fn(),
    updateProject: jest.fn(),
    deleteProject: jest.fn(),
    deleteColumn: jest.fn(),
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
      controllers: [ProjectController],
      providers: [{ provide: ProjectService, useValue: projectService }],
    }).compile();

    controller = module.get<ProjectController>(ProjectController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getAllProjects should delegate to service', async () => {
    projectService.getAllProjects.mockResolvedValue([{ _id: 'project-1' }]);

    const result = await controller.getAllProjects(req as never);

    expect(projectService.getAllProjects).toHaveBeenCalledWith(
      req.user._id,
      req.user.role,
    );
    expect(result).toEqual([{ _id: 'project-1' }]);
  });

  it('getProjectsByUserId should return wrapped response', async () => {
    projectService.getProjectsByUserId.mockResolvedValue([
      { _id: 'project-1' },
    ]);

    const result = await controller.getProjectsByUserId(req as never);

    expect(projectService.getProjectsByUserId).toHaveBeenCalledWith(
      req.user._id,
    );
    expect(result).toEqual({
      success: true,
      result: [{ _id: 'project-1' }],
    });
  });

  it('getProjectById should pass user and project ids to service', async () => {
    projectService.getProjectById.mockResolvedValue({ _id: 'project-1' });

    const result = await controller.getProjectById(req as never, 'project-1');

    expect(projectService.getProjectById).toHaveBeenCalledWith(
      req.user._id,
      'project-1',
      req.user.role,
    );
    expect(result).toEqual({
      success: true,
      result: { _id: 'project-1' },
    });
  });

  it('getUserByProjectId should map member users', async () => {
    projectService.getUserByProjectId.mockResolvedValue({
      members: [{ user: { _id: 'u1' } }, { user: { _id: 'u2' } }],
    });

    const result = await controller.getUserByProjectId('project-1');

    expect(projectService.getUserByProjectId).toHaveBeenCalledWith('project-1');
    expect(result).toEqual({
      success: true,
      result: [{ _id: 'u1' }, { _id: 'u2' }],
    });
  });

  it('createProject should delegate and return success payload', async () => {
    const dto = { name: 'Alpha' };
    const file = { originalname: 'icon.png' };

    projectService.createProject.mockResolvedValue({ _id: 'project-1' });

    const result = await controller.createProject(
      req as never,
      dto as never,
      file as never,
    );

    expect(projectService.createProject).toHaveBeenCalledWith(
      req.user._id,
      req.user.role,
      dto,
      file,
    );
    expect(result).toEqual({
      success: true,
      result: { _id: 'project-1' },
      message: 'Project created successfully',
    });
  });

  it('updateProject should delegate and return success payload', async () => {
    const dto = { name: 'Renamed' };
    const file = { originalname: 'icon.png' };

    projectService.updateProject.mockResolvedValue({ _id: 'project-1' });

    const result = await controller.updateProject(
      'project-1',
      req as never,
      dto as never,
      file as never,
    );

    expect(projectService.updateProject).toHaveBeenCalledWith(
      req.user._id,
      req.user.role,
      'project-1',
      dto,
      file,
    );
    expect(result).toEqual({
      success: true,
      result: { _id: 'project-1' },
      message: 'Project updated successfully',
    });
  });

  it('deleteProject should delegate and return success payload', async () => {
    projectService.deleteProject.mockResolvedValue({ _id: 'project-1' });

    const result = await controller.deleteProject('project-1', req as never);

    expect(projectService.deleteProject).toHaveBeenCalledWith(
      req.user._id,
      req.user.role,
      'project-1',
    );
    expect(result).toEqual({
      success: true,
      result: { _id: 'project-1' },
      message: 'Project successfully deleted',
    });
  });

  it('deleteColumn should delegate and return success payload', async () => {
    projectService.deleteColumn.mockResolvedValue({ _id: 'project-1' });

    const result = await controller.deleteColumn(
      'project-1',
      'todo',
      req as never,
    );

    expect(projectService.deleteColumn).toHaveBeenCalledWith(
      req.user._id,
      req.user.role,
      'project-1',
      'todo',
    );
    expect(result).toEqual({
      success: true,
      result: { _id: 'project-1' },
      message: 'Column successfully deleted',
    });
  });
});

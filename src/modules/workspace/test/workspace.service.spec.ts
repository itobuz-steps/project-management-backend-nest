/// <reference types="jest" />

jest.mock('../entities/workspace.entity', () => ({
  Workspace: class Workspace {},
}));

jest.mock('src/middlewares/isAuthenticated', () => ({
  IsAuthenticated: class IsAuthenticated {
    canActivate(): boolean {
      return true;
    }
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { UnauthorizedException } from '@nestjs/common';
import { WorkspaceService } from '../workspace.service';
import { Role } from 'src/modules/auth/types/auth.types';

type PipelineStage = Record<string, unknown>;
type LookupStage = {
  $lookup: {
    from: string;
    as: string;
    pipeline: PipelineStage[];
  };
};

const isLookupStage = (stage: PipelineStage): stage is LookupStage =>
  '$lookup' in stage;

const hasProjectsSizeMatchStage = (stage: PipelineStage): boolean => {
  if (!('$match' in stage)) {
    return false;
  }

  const match = stage.$match;

  return (
    typeof match === 'object' &&
    match !== null &&
    '$expr' in (match as Record<string, unknown>)
  );
};

describe('WorkspaceService', () => {
  let service: WorkspaceService;

  const workspaceModel = {
    create: jest.fn(),
    aggregate: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  };

  const getAggregatePipeline = (): PipelineStage[] => {
    const calls = workspaceModel.aggregate.mock.calls as Array<
      [PipelineStage[]]
    >;
    const [firstCall] = calls;

    if (!firstCall) {
      throw new Error('Expected aggregate to be called at least once');
    }

    return firstCall[0];
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceService,
        { provide: getModelToken('Workspace'), useValue: workspaceModel },
      ],
    }).compile();

    service = module.get<WorkspaceService>(WorkspaceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create should throw when role is not superadmin', async () => {
    await expect(
      service.create({ name: 'Engineering' } as never, Role.USER),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(workspaceModel.create).not.toHaveBeenCalled();
  });

  it('create should create workspace for superadmin', async () => {
    workspaceModel.create.mockResolvedValue({
      _id: new Types.ObjectId(),
      name: 'Engineering',
    });

    const result = await service.create(
      { name: 'Engineering' } as never,
      Role.SUPERADMIN,
    );

    expect(workspaceModel.create).toHaveBeenCalledWith({
      name: 'Engineering',
    });
    expect(result).toEqual(
      expect.objectContaining({
        name: 'Engineering',
      }),
    );
  });

  it('findAll should use member-filtered pipeline for normal users', async () => {
    workspaceModel.aggregate.mockResolvedValue([
      {
        workspaceId: new Types.ObjectId(),
        workspaceName: 'Engineering',
        projects: [{ _id: new Types.ObjectId() }],
      },
    ]);

    const userId = '507f1f77bcf86cd799439011';
    const result = await service.findAll(userId, Role.USER);

    expect(workspaceModel.aggregate).toHaveBeenCalledTimes(1);
    const calledPipeline = getAggregatePipeline();

    expect(calledPipeline.some(isLookupStage)).toBe(true);
    expect(calledPipeline.some(hasProjectsSizeMatchStage)).toBe(true);

    const lookupStage = calledPipeline.find(isLookupStage);

    if (!lookupStage) {
      throw new Error('Expected lookup stage in aggregate pipeline');
    }

    const lookup = lookupStage.$lookup;

    expect(lookup.pipeline).toEqual(
      expect.arrayContaining([
        {
          $match: {
            'members.user': new Types.ObjectId(userId),
          },
        },
      ]),
    );

    expect(result).toHaveLength(1);
  });

  it('findAll should use admin pipeline without member match', async () => {
    workspaceModel.aggregate.mockResolvedValue([]);

    await service.findAll('user-1', Role.SUPERADMIN);

    expect(workspaceModel.aggregate).toHaveBeenCalledTimes(1);
    const calledPipeline = getAggregatePipeline();

    expect(calledPipeline.some(hasProjectsSizeMatchStage)).toBe(false);

    const lookupStage = calledPipeline.find(isLookupStage);

    if (!lookupStage) {
      throw new Error('Expected lookup stage in aggregate pipeline');
    }

    const lookup = lookupStage.$lookup;

    expect(lookup.pipeline).toHaveLength(1);
    expect('$match' in lookup.pipeline[0]).toBe(true);
  });

  it('update should throw when role is not superadmin', async () => {
    await expect(
      service.update('workspace-1', { name: 'Renamed' } as never, Role.USER),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(workspaceModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('update should call findByIdAndUpdate with new true for superadmin', async () => {
    workspaceModel.findByIdAndUpdate.mockResolvedValue({
      _id: 'workspace-1',
      name: 'Renamed',
    });

    const result = await service.update(
      'workspace-1',
      { name: 'Renamed' } as never,
      Role.SUPERADMIN,
    );

    expect(workspaceModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'workspace-1',
      { name: 'Renamed' },
      { new: true },
    );
    expect(result).toEqual({ _id: 'workspace-1', name: 'Renamed' });
  });

  it('delete should throw when role is not superadmin', async () => {
    await expect(
      service.delete('workspace-1', Role.USER),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(workspaceModel.findByIdAndDelete).not.toHaveBeenCalled();
  });

  it('delete should call findByIdAndDelete for superadmin', async () => {
    workspaceModel.findByIdAndDelete.mockResolvedValue({ _id: 'workspace-1' });

    const result = await service.delete('workspace-1', Role.SUPERADMIN);

    expect(workspaceModel.findByIdAndDelete).toHaveBeenCalledWith(
      'workspace-1',
    );
    expect(result).toEqual({ _id: 'workspace-1' });
  });
});

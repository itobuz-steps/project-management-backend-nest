import { Injectable, UnauthorizedException, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IsAuthenticated } from 'src/middlewares/isAuthenticated';
import { ObjectIdLike } from 'src/type/common.type';
import { Role } from '../auth/types/auth.types';
import { Project } from '../project/schema/project.schema';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { Workspace } from './entities/workspace.entity';

@UseGuards(IsAuthenticated)
@Injectable()
export class WorkspaceService {
  constructor(
    @InjectModel(Workspace.name) private workspaceModel: Model<Workspace>,
  ) {}

  async create(createWorkspaceDto: CreateWorkspaceDto, role: Role) {
    if (role !== Role.SUPERADMIN) {
      throw new UnauthorizedException(
        'Only super admins can create workspaces',
      );
    }

    const newWorkspace = await this.workspaceModel.create(createWorkspaceDto);
    return newWorkspace;
  }

  async findAll(userId: ObjectIdLike, role: Role) {
    const normalizedUserId =
      typeof userId === 'string' && Types.ObjectId.isValid(userId)
        ? new Types.ObjectId(userId)
        : userId;

    const pipeline = [
      ...(role === Role.SUPERADMIN
        ? [
            {
              $lookup: {
                from: 'projects',
                let: { workspaceId: '$_id' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ['$workspaceId', '$$workspaceId'],
                      },
                    },
                  },
                ],
                as: 'projects',
              },
            },
          ]
        : [
            {
              $lookup: {
                from: 'projects',
                let: { workspaceId: '$_id' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ['$workspaceId', '$$workspaceId'],
                      },
                    },
                  },
                  {
                    $match: {
                      'members.user': normalizedUserId,
                    },
                  },
                ],
                as: 'projects',
              },
            },
            {
              $match: {
                $expr: {
                  $gt: [{ $size: '$projects' }, 0],
                },
              },
            },
          ]),
      {
        $project: {
          _id: 0,
          workspaceId: '$_id',
          workspaceName: '$name',
          projects: 1,
        },
      },
    ];

    const result = await this.workspaceModel.aggregate<
      {
        workspaceId: Types.ObjectId;
        workspaceName: string;
        projects: Project[];
      }[]
    >(pipeline);

    return result;
  }

  async update(
    id: ObjectIdLike,
    updateWorkspaceDto: UpdateWorkspaceDto,
    role: Role,
  ) {
    if (role !== Role.SUPERADMIN) {
      throw new UnauthorizedException(
        'Only super admins can update workspaces',
      );
    }

    const result = await this.workspaceModel.findByIdAndUpdate(
      id,
      updateWorkspaceDto,
      { new: true },
    );
    return result;
  }

  async delete(id: ObjectIdLike, role: Role) {
    if (role !== Role.SUPERADMIN) {
      throw new UnauthorizedException(
        'Only super admins can delete workspaces',
      );
    }

    const result = await this.workspaceModel.findByIdAndDelete(id);
    return result;
  }
}

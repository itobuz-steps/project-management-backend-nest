import { Injectable, UnauthorizedException, UseGuards } from '@nestjs/common';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Workspace } from './entities/workspace.entity';
import { Model } from 'mongoose';
import { ObjectIdLike } from 'src/type/common.type';
import { IsAuthenticated } from 'src/middlewares/isAuthenticated';
import { Role } from '../auth/types/auth.types';
import { Project } from '../project/schema/project.schema';
import { ProjectService } from '../project/services/project.service';

@UseGuards(IsAuthenticated)
@Injectable()
export class WorkspaceService {
  constructor(
    @InjectModel(Workspace.name) private workspaceModel: Model<Workspace>,
    private readonly projectService: ProjectService,
  ) {}
  async create(createWorkspaceDto: CreateWorkspaceDto) {
    const newWorkspace = await this.workspaceModel.create(createWorkspaceDto);
    return newWorkspace;
  }

  async findAll(userId: ObjectIdLike, role: Role) {
    const userProjects = await this.projectService.getAllProjects(userId, role);
    const workspaceIds = userProjects.map((project: Project) =>
      project.workspace.toString(),
    );

    const result = await this.workspaceModel.find({
      _id: { $in: workspaceIds },
    });

    return result;
  }

  async findOne(id: ObjectIdLike) {
    const result = await this.workspaceModel.findById(id);
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

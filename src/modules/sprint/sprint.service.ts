import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Sprint } from './schema/sprint.schema';
import { Project } from '../project/schema/project.schema';
import { ObjectIdLike } from 'src/type/common.type';

@Injectable()
export class SprintService {
  constructor(
    @InjectModel(Sprint.name)
    private readonly sprintModel: Model<Sprint>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,
  ) {}

  async getAllSprints(): Promise<Sprint[]> {
    return this.sprintModel.find();
  }

  async getSprintById(
    userId: ObjectIdLike,
    sprintId: ObjectIdLike,
  ): Promise<Sprint> {
    const sprint = await this.sprintModel.findById(sprintId);

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    const project = await this.projectModel.findOne({
      _id: sprint.projectId,
      'members.user': userId,
    });

    if (!project) {
      throw new ForbiddenException('Unauthorized');
    }

    return sprint;
  }

  async getSprintsByProjectId(
    userId: ObjectIdLike,
    projectId: ObjectIdLike,
  ): Promise<Sprint[]> {
    const projectObjectId =
      typeof projectId === 'string' ? new Types.ObjectId(projectId) : projectId;

    const project = await this.projectModel.findOne({
      _id: projectObjectId,
      'members.user': userId,
    });

    if (!project) {
      throw new ForbiddenException('Unauthorized');
    }

    return this.sprintModel.find({ projectId: projectObjectId });
  }
}

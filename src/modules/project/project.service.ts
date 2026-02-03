import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project } from './schema/project.schema';

type ObjectIdLike = string | Types.ObjectId;

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,
  ) {}

  async getAllProjects(
    userId: ObjectIdLike | string | undefined,
  ): Promise<Project[]> {
    return this.projectModel.find({
      'members.user': userId,
    });
  }

  async getProjectById(
    userId: ObjectIdLike | string | undefined,
    projectId: ObjectIdLike,
  ): Promise<Project> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new NotFoundException('Invalid Project ID');
    }

    const project = await this.projectModel.findOne({
      _id: projectId,
      'members.user': userId,
    });

    if (!project) {
      throw new NotFoundException('Project by given id not found');
    }

    return project;
  }
}

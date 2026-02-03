import { Injectable } from '@nestjs/common';
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

  async getAllProjects(userId: ObjectIdLike): Promise<Project[]> {
    return this.projectModel.find({
      'members.user': userId,
    });
  }
}

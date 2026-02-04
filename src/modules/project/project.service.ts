import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project } from './schema/project.schema';
import { ObjectIdLike } from './type/project.types';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

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

  async getProjectById(
    userId: ObjectIdLike,
    projectId: ObjectIdLike,
  ): Promise<Project> {
    const project = await this.projectModel.findOne({
      _id: projectId,
      'members.user': userId,
    });

    if (!project) {
      throw new NotFoundException('Project by given id not found');
    }

    return project;
  }

  async getUserByProjectId(projectId: ObjectIdLike) {
    const project = await this.projectModel
      .findById(projectId)
      .populate('members.user', 'name email profileImage onlineStatus');

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async getProjectsByUserId(userId: ObjectIdLike): Promise<Project[]> {
    return this.projectModel.find({
      'members.user': userId,
    });
  }

  async createProject(
    userId: ObjectIdLike,
    dto: CreateProjectDto,
  ): Promise<Project> {
    const prefix =
      dto.prefix ??
      dto.name
        .split(' ')
        .map((word) => word[0]?.toUpperCase() || '')
        .join('');

    const project = new this.projectModel({
      ...dto,
      memberLead: userId,
      members: [{ user: userId, role: 'admin' }],
      prefix,
    });

    return project.save();
  }

  async updateProject(
    userId: ObjectIdLike,
    projectId: ObjectIdLike,
    update: UpdateProjectDto,
  ): Promise<Project> {
    const project = await this.projectModel.findOneAndUpdate(
      {
        _id: projectId,
        members: {
          $elemMatch: {
            user: userId,
            role: 'admin',
          },
        },
      },
      { $set: update },
      { new: true },
    );

    if (!project) {
      throw new ForbiddenException('Not allowed to update this project');
    }

    return project;
  }

  async deleteProject(
    userId: ObjectIdLike,
    projectId: ObjectIdLike,
  ): Promise<Project> {
    const project = await this.projectModel.findOneAndDelete({
      _id: projectId,
      members: {
        $elemMatch: {
          user: userId,
          role: 'admin',
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project by given id not found');
    }

    return project;
  }
}

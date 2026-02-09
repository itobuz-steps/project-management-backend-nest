import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project } from './schema/project.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { generateProjectPrefix } from 'src/utils/project-prefix.util';
import { ObjectIdLike } from 'src/type/common.type';
import { NotificationPushService } from '../notification/services/notification-push.service';
import { Role } from '../auth/types/auth.types';

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,

    private readonly notificationPushService: NotificationPushService,
  ) {}

  async getAllProjects(userId: ObjectIdLike, role: Role): Promise<Project[]> {
    if (role === Role.ADMIN) {
      return this.projectModel.find({
        'members.user': userId,
      });
    } else {
      return this.projectModel.find();
    }
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
    const prefix = dto.prefix ?? generateProjectPrefix(dto.name);

    const project = new this.projectModel({
      ...dto,
      memberLead: userId,
      members: [{ user: userId, role: 'admin' }],
      prefix,
    });

    const savedProject = await project.save();

    await this.notificationPushService.pushNotificationToUser(userId, {
      title: `Project "${savedProject.name}" Created`,
      message: `Project "${savedProject.name}" was created`,
      projectId: savedProject._id,
    });

    return savedProject;
  }

  async updateProject(
    userId: ObjectIdLike,
    projectId: ObjectIdLike,
    update: UpdateProjectDto,
  ): Promise<Project> {
    const updatePayload: Record<string, any> = { ...update };

    if (update.name) {
      updatePayload.prefix = generateProjectPrefix(update.name);
    }

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
      updatePayload,
      { new: true },
    );

    if (!project) {
      throw new ForbiddenException('Not allowed to update this project');
    }

    await this.notificationPushService.pushNotificationToProjectMembers(
      project._id,
      {
        title: `Project "${project.name}" Updated`,
        message: `Project "${project.name}" was updated`,
        projectId: project._id,
      },
    );

    return project;
  }

  async deleteProject(
    userId: ObjectIdLike,
    projectId: ObjectIdLike,
  ): Promise<Project> {
    const project = await this.projectModel.findOne({
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

    await this.notificationPushService.pushNotificationToProjectMembers(
      project._id,
      {
        title: `Project "${project.name}" Deleted`,
        message: `Project "${project.name}" was deleted`,
        projectId: project._id,
      },
    );

    await project.deleteOne();

    return project;
  }
}

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project } from '../schema/project.schema';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { generateProjectPrefix } from 'src/utils/project-prefix.util';
import { ObjectIdLike } from 'src/type/common.type';
import { NotificationPushService } from '../../notification/services/notification-push.service';
import { Role } from '../../auth/types/auth.types';
import { Task } from '../../tasks/entities/task.entity';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { StorageService } from 'src/storage/storage.service';

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,

    @InjectModel('Task')
    private readonly taskModel: Model<Task>,

    @InjectConnection()
    private readonly connection: Connection,

    private readonly notificationPushService: NotificationPushService,
    private readonly storageService: StorageService,
  ) {}

  async getAllProjects(userId: ObjectIdLike, role: Role): Promise<Project[]> {
    if (role === Role.SUPERADMIN) {
      return this.projectModel.find();
    }

    return this.projectModel.find({
      'members.user': userId,
    });
  }

  async getProjectById(
    userId: ObjectIdLike,
    projectId: ObjectIdLike,
    role: Role,
  ): Promise<Project> {
    let project: Project | null;

    if (role === Role.SUPERADMIN) {
      project = await this.projectModel.findById(projectId);
    } else {
      project = await this.projectModel.findOne({
        _id: projectId,
        'members.user': userId,
      });
    }

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
    role: Role,
    dto: CreateProjectDto,
    file?: Express.Multer.File,
  ): Promise<Project> {
    if (role !== Role.SUPERADMIN) {
      throw new ForbiddenException('Only superadmin can create projects');
    }

    const prefix = dto.prefix ?? generateProjectPrefix(dto.name);

    let iconUrl: string | undefined;
    let iconKey: string | undefined;

    if (file) {
      const uploadRes = await this.storageService.uploadSingleFile(file);

      iconUrl = uploadRes.url;
      iconKey = uploadRes.key;
    }

    const project = new this.projectModel({
      ...dto,
      prefix,
      icon: iconUrl,
      iconKey,
      memberLead: userId,
      members: [{ user: userId, role: 'admin' }],
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
    role: Role,
    projectId: ObjectIdLike,
    update: UpdateProjectDto,
    file?: Express.Multer.File,
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
      throw new ForbiddenException('Not allowed to update this project');
    }

    const updatePayload = { ...update };

    if (file) {
      const uploadRes = await this.storageService.uploadSingleFile(file);

      if (project.iconKey) {
        try {
          await this.storageService.deleteFile(project.iconKey);
        } catch (err) {
          console.warn('Failed to delete old project icon', err);
        }
      }

      updatePayload.icon = uploadRes.url;
      updatePayload.iconKey = uploadRes.key;
    }

    const updatedProject = await this.projectModel.findByIdAndUpdate(
      projectId,
      { $set: updatePayload },
      { new: true },
    );

    await this.notificationPushService.pushNotificationToProjectMembers(
      projectId,
      {
        title: `Project "${updatedProject!.name}" Updated`,
        message: `Project "${updatedProject!.name}" was updated`,
        projectId: updatedProject!._id,
      },
    );

    return updatedProject!;
  }

  async deleteProject(
    userId: ObjectIdLike,
    role: Role,
    projectId: ObjectIdLike,
  ): Promise<Project> {
    if (role !== Role.SUPERADMIN) {
      throw new ForbiddenException('Only superadmin can delete projects');
    }

    const project = await this.projectModel.findOne({
      _id: projectId,
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

  async deleteColumn(
    userId: ObjectIdLike,
    role: Role,
    projectId: ObjectIdLike,
    columnName: string,
  ): Promise<Project> {
    if (role !== Role.SUPERADMIN) {
      throw new ForbiddenException('Only superadmin can delete columns');
    }

    const project = await this.projectModel.findById(projectId);

    if (!project) {
      throw new NotFoundException('Project by given id not found');
    }

    if (!project.columns.includes(columnName)) {
      throw new NotFoundException('Column not found');
    }

    const taskCount = await this.taskModel.countDocuments({
      projectId: projectId,
      status: columnName,
    });

    if (taskCount) {
      throw new BadRequestException(
        `Cannot delete column "${columnName}" because it contains ${taskCount} task(s).`,
      );
    }
    // If no tasks, safe to delete
    project.columns = project.columns.filter((col) => col !== columnName);

    await project.save();

    return project;
  }
}

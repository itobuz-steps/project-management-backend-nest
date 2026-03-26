import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
import { ActivityService } from 'src/modules/activity/services/activity.service';

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
    private readonly activityService: ActivityService,
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
      workspaceId: dto.workspaceId ? new Types.ObjectId(dto.workspaceId) : null,
      memberLead: userId,
      members: [{ user: userId, role: 'admin' }],
    });

    const savedProject = await project.save();

    await this.activityService.logProjectCreated(
      savedProject._id.toString(),
      userId.toString(),
      savedProject.name,
    );

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
    const project =
      role === Role.SUPERADMIN
        ? await this.projectModel.findById(projectId)
        : await this.projectModel.findOne({
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

    const previousDefaultAssignee = project.defaultAssignee?.toString() || null;

    const updatePayload = { ...update };

    const updatedColumns: Record<string, { from: string; to: string }> = {};

    for (const key of Object.keys(updatePayload)) {
      const oldVal = project[key as keyof typeof project];
      const newVal = updatePayload[key as keyof typeof updatePayload];

      const serialize = (value: unknown): string => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        if (typeof value === 'string') return value;
        if (typeof value === 'number' || typeof value === 'boolean')
          return String(value);
        return '';
      }; // type coversion needed fix

      const oldValue = serialize(oldVal);
      const newValue = serialize(newVal);

      if (oldValue !== newValue) {
        updatedColumns[key] = { from: oldValue, to: newValue };
      }
    }

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

    const newDefaultAssignee =
      updatePayload.defaultAssignee?.toString() ||
      updatedProject?.defaultAssignee?.toString() ||
      null;

    if (!previousDefaultAssignee && newDefaultAssignee) {
      await this.taskModel.updateMany(
        {
          projectId: projectId,
          assignee: null,
        },
        {
          $set: { assignee: new Types.ObjectId(newDefaultAssignee) },
        },
      );
    }

    await this.activityService.logUpdateProject(
      projectId.toString(),
      userId.toString(),
      updatedColumns,
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

    await this.activityService.logProjectDelete(
      projectId.toString(),
      userId.toString(),
    );

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

    await this.activityService.logDeleteProjectColumn(
      projectId.toString(),
      userId.toString(),
      columnName,
    );

    return project;
  }
}

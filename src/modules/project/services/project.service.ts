import {
  ForbiddenException,
  Injectable,
  NotFoundException,
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
  ): Promise<Project> {
    if (role !== Role.SUPERADMIN) {
      throw new ForbiddenException('Only superadmin can create projects');
    }

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
    role: Role,
    projectId: ObjectIdLike,
    update: UpdateProjectDto,
  ): Promise<Project> {
    if (role !== Role.SUPERADMIN) {
      throw new ForbiddenException('Only superadmin can update projects');
    }

    const updatePayload = { ...update };

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
    role: Role,
    projectId: ObjectIdLike,
  ): Promise<Project> {
    if (role !== Role.SUPERADMIN) {
      throw new ForbiddenException('Only superadmin can delete projects');
    }

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

  async deleteColumn(
    userId: ObjectIdLike,
    role: Role,
    projectId: ObjectIdLike,
    columnName: string,
  ): Promise<Project> {
    if (role !== Role.SUPERADMIN) {
      throw new ForbiddenException('Only superadmin can delete columns');
    }

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

    if (!project.columns.includes(columnName)) {
      throw new NotFoundException('Column by given name not found');
    }

    // Start a session for transaction
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // Remove the column from the project
      project.columns = project.columns.filter((col) => col !== columnName);
      await project.save({ session });

      // Update tasks that have the deleted column as their status
      await this.taskModel.updateMany(
        { project: projectId, status: columnName },
        { $set: { status: project.columns[0] } },
        { session },
      );

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    await this.notificationPushService.pushNotificationToProjectMembers(
      project._id,
      {
        title: `Column "${columnName}" Deleted`,
        message: `Column "${columnName}" was deleted from project "${project.name}"`,
        projectId: project._id,
      },
    );

    return project;
  }
}

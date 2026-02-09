import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Sprint } from './schema/sprint.schema';
import { Project } from '../project/schema/project.schema';
import { ObjectIdLike } from 'src/type/common.type';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { NotificationPushService } from '../notification/services/notification-push.service';
import { Role } from '../auth/types/auth.types';
import { getProjectWithAccess } from 'src/utils/project-access.util';

@Injectable()
export class SprintService {
  constructor(
    @InjectModel(Sprint.name)
    private readonly sprintModel: Model<Sprint>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,

    private readonly notificationPushService: NotificationPushService,
  ) {}

  async getAllSprints(): Promise<Sprint[]> {
    return this.sprintModel.find();
  }

  async getSprintById(
    userId: ObjectIdLike,
    sprintId: ObjectIdLike,
    role: Role,
  ): Promise<Sprint> {
    const sprint = await this.sprintModel.findById(sprintId);

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    const project = await getProjectWithAccess(
      this.projectModel,
      sprint.projectId,
      userId,
      role,
    );

    if (!project) {
      throw new ForbiddenException('Unauthorized');
    }

    return sprint;
  }

  async getSprintsByProjectId(
    userId: ObjectIdLike,
    projectId: ObjectIdLike,
    role: Role,
  ): Promise<Sprint[]> {
    const project = await getProjectWithAccess(
      this.projectModel,
      projectId,
      userId,
      role,
    );

    if (!project) {
      throw new ForbiddenException('Unauthorized');
    }

    return this.sprintModel.find({ projectId });
  }

  async createSprint(
    userId: ObjectIdLike,
    projectId: ObjectIdLike,
    dto: CreateSprintDto,
    role: Role,
  ): Promise<Sprint> {
    const project = await getProjectWithAccess(
      this.projectModel,
      projectId,
      userId,
      role,
    );

    if (!project) {
      throw new ForbiddenException('Unauthorized');
    }

    const sprint = new this.sprintModel({
      ...dto,
      projectId,
      key: `${project.prefix}-sprint-${project.sprintCount + 1}`,
    });

    project.sprintCount += 1;

    await sprint.save();
    await project.save();

    await this.notificationPushService.pushNotificationToProjectMembers(
      project._id,
      {
        title: `Sprint ${sprint.key} Created`,
        message: `Sprint ${sprint.key} has been created`,
        projectId: project._id,
      },
    );

    return sprint;
  }

  async updateSprint(
    userId: ObjectIdLike,
    projectId: ObjectIdLike,
    sprintId: ObjectIdLike,
    update: UpdateSprintDto,
    role: Role,
  ): Promise<Sprint> {
    const sprint = await this.sprintModel.findById(sprintId);

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    const project = await getProjectWithAccess(
      this.projectModel,
      projectId,
      userId,
      role,
    );

    if (!project) {
      throw new ForbiddenException('Unauthorized');
    }

    const updatedSprint = await this.sprintModel.findByIdAndUpdate(
      sprintId,
      { $set: update },
      { new: true },
    );

    if (!updatedSprint) {
      throw new NotFoundException('Sprint not found');
    }

    await this.notificationPushService.pushNotificationToProjectMembers(
      project._id,
      {
        title: `Sprint ${sprint.key} Updated`,
        message: `Sprint ${sprint.key} has been updated`,
        projectId: project._id,
      },
    );

    return updatedSprint;
  }

  async deleteSprint(
    userId: ObjectIdLike,
    projectId: ObjectIdLike,
    sprintId: ObjectIdLike,
    role: Role,
  ): Promise<Sprint> {
    const sprint = await this.sprintModel.findById(sprintId);

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    const project = await getProjectWithAccess(
      this.projectModel,
      projectId,
      userId,
      role,
    );

    if (!project) {
      throw new ForbiddenException('Unauthorized');
    }

    await sprint.deleteOne();

    await this.notificationPushService.pushNotificationToProjectMembers(
      project._id,
      {
        title: `Sprint ${sprint.key} Deleted`,
        message: `Sprint ${sprint.key} has been deleted`,
        projectId: project._id,
      },
    );

    return sprint;
  }

  async addTasksIntoSprint(
    userId: ObjectIdLike,
    projectId: ObjectIdLike,
    sprintId: ObjectIdLike,
    tasks: ObjectIdLike[],
    role: Role,
  ): Promise<Sprint> {
    const sprint = await this.sprintModel.findById(sprintId);

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    const project = await getProjectWithAccess(
      this.projectModel,
      projectId,
      userId,
      role,
    );

    if (!project) {
      throw new ForbiddenException('Unauthorized');
    }

    const updatedSprint = await this.sprintModel.findByIdAndUpdate(
      sprintId,
      {
        // prevents duplicates automatically
        $addToSet: { tasks: { $each: tasks } },
      },
      { new: true },
    );

    if (!updatedSprint) {
      throw new NotFoundException('Sprint not found');
    }

    await this.notificationPushService.pushNotificationToProjectMembers(
      sprint.projectId,
      {
        title: `${tasks.length} task(s) added to sprint ${updatedSprint.key}`,
        message: `${tasks.length} task(s) added to sprint ${updatedSprint.key}`,
        projectId: sprint.projectId,
      },
    );

    return updatedSprint;
  }

  async removeTaskFromSprint(
    userId: ObjectIdLike,
    projectId: ObjectIdLike,
    sprintId: ObjectIdLike,
    taskId: ObjectIdLike,
    role: Role,
  ): Promise<Sprint> {
    const sprint = await this.sprintModel.findById(sprintId);

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    const project = await getProjectWithAccess(
      this.projectModel,
      projectId,
      userId,
      role,
    );

    if (!project) {
      throw new ForbiddenException('Unauthorized');
    }

    const updatedSprint = await this.sprintModel.findByIdAndUpdate(
      sprintId,
      { $pull: { tasks: taskId } },
      { new: true },
    );

    if (!updatedSprint) {
      throw new NotFoundException('Sprint not found');
    }

    await this.notificationPushService.pushNotificationToProjectMembers(
      sprint.projectId,
      {
        title: `Task Removed from sprint ${updatedSprint.key}`,
        message: `A task was removed from sprint ${updatedSprint.key}`,
        projectId: sprint.projectId,
        taskId,
      },
    );

    return updatedSprint;
  }
}

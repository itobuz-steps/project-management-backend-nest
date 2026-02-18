import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Sprint } from './schema/sprint.schema';
import { Task } from '../tasks/entities/task.entity';
import { Activity } from '../activity/schemas/activity.schemas';
import { ActivityAction } from '../activity/type/activity.types';
import { Project } from '../project/schema/project.schema';
import { ObjectIdLike } from 'src/type/common.type';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { NotificationPushService } from '../notification/services/notification-push.service';
import { getProjectWithAccess } from 'src/utils/project-access.util';
import {
  ProjectAccessParams,
  SprintIdParams,
  SprintAccessParams,
  StatusActivity,
} from './type/sprint.types';
import { ActivityService } from '../activity/services/activity.service';

@Injectable()
export class SprintService {
  constructor(
    @InjectModel(Sprint.name)
    private readonly sprintModel: Model<Sprint>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,
    @InjectModel(Task.name) private readonly taskModel: Model<Task>,
    @InjectModel(Activity.name) private readonly activityModel: Model<Activity>,

    private readonly notificationPushService: NotificationPushService,
    private readonly activityService: ActivityService,
  ) {}

  async getAllSprints(): Promise<Sprint[]> {
    return this.sprintModel.find();
  }

  async getSprintById(params: SprintAccessParams): Promise<Sprint> {
    const { userId, sprintId, role } = params;

    const sprint = await this.sprintModel.findById(sprintId);

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    const project = await getProjectWithAccess(this.projectModel, {
      projectId: sprint.projectId,
      userId,
      role,
    });

    if (!project) {
      throw new ForbiddenException('Unauthorized');
    }

    return sprint;
  }

  async getSprintsByProjectId(params: ProjectAccessParams): Promise<Sprint[]> {
    const { userId, projectId, role } = params;

    const project = await getProjectWithAccess(this.projectModel, {
      projectId,
      userId,
      role,
    });

    if (!project) {
      throw new ForbiddenException('Unauthorized');
    }

    return this.sprintModel.find({ projectId });
  }

  async createSprint(
    dto: CreateSprintDto,
    params: ProjectAccessParams,
  ): Promise<Sprint> {
    const { userId, projectId, role } = params;

    const project = await getProjectWithAccess(this.projectModel, {
      projectId,
      userId,
      role,
    });

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
    update: UpdateSprintDto,
    params: SprintIdParams,
  ): Promise<Sprint> {
    const { userId, projectId, sprintId, role } = params;

    const sprint = await this.sprintModel.findById(sprintId);

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    const project = await getProjectWithAccess(this.projectModel, {
      projectId,
      userId,
      role,
    });

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

  async deleteSprint(params: SprintIdParams): Promise<Sprint> {
    const { userId, projectId, sprintId, role } = params;

    const sprint = await this.sprintModel.findById(sprintId);

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    const project = await getProjectWithAccess(this.projectModel, {
      projectId,
      userId,
      role,
    });

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

  async completeSprint(params: SprintIdParams): Promise<Sprint> {
    const { userId, projectId, sprintId, role } = params;

    const sprint = await this.sprintModel.findById(sprintId);

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    if (sprint.isCompleted) {
      throw new ForbiddenException('Sprint is already completed');
    }

    const project = await getProjectWithAccess(this.projectModel, {
      projectId,
      userId,
      role,
    });

    if (!project) {
      throw new ForbiddenException('Unauthorized');
    }

    sprint.isCompleted = true;
    sprint.endDate = new Date(); // Set the end date to the current time
    await sprint.save();

    await this.notificationPushService.pushNotificationToProjectMembers(
      project._id,
      {
        title: `Sprint ${sprint.key} Completed`,
        message: `Sprint ${sprint.key} has been completed`,
        projectId: project._id,
      },
    );

    return sprint;
  }

  async addTasksIntoSprint(
    tasks: ObjectIdLike[],
    params: SprintIdParams,
  ): Promise<Sprint> {
    const { userId, projectId, sprintId, role } = params;

    const sprint = await this.sprintModel.findById(sprintId);

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    const project = await getProjectWithAccess(this.projectModel, {
      projectId,
      userId,
      role,
    });

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
      updatedSprint.projectId,
      {
        title: `${tasks.length} task(s) added to sprint ${updatedSprint.key}`,
        message: `${tasks.length} task(s) added to sprint ${updatedSprint.key}`,
        projectId: updatedSprint.projectId,
      },
    );

    return updatedSprint;
  }

  async removeTaskFromSprint(
    taskId: ObjectIdLike,
    params: SprintIdParams,
  ): Promise<Sprint> {
    const { userId, projectId, sprintId, role } = params;

    const sprint = await this.sprintModel.findById(sprintId);

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    const project = await getProjectWithAccess(this.projectModel, {
      projectId,
      userId,
      role,
    });

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
      updatedSprint.projectId,
      {
        title: `Task Removed from sprint ${updatedSprint.key}`,
        message: `A task was removed from sprint ${updatedSprint.key}`,
        projectId: updatedSprint.projectId,
        taskId,
      },
    );

    await this.activityService.logRemovedFromSprint({
      taskId,
      byUserId: userId,
      sprintId: updatedSprint._id,
    });

    return updatedSprint;
  }

  async getTasksMovedToBacklogAtSprintEnd(sprintId: string) {
    const sprint = await this.sprintModel.findById(sprintId);

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    // Find activities where tasks were removed from this sprint
    const removedActivities = await this.activityModel
      .find({
        action: ActivityAction.REMOVED_FROM_SPRINT,
        'updatedFields.sprint.from': sprintId.toString(),
      })
      .exec();

    const taskIds = removedActivities.map((a) => a.task._id);

    if (!taskIds.length) return [];

    // Return tasks that were removed from sprint and are now in backlog
    const backlogTasks = await this.taskModel
      .find({
        _id: { $in: taskIds },
        status: { $regex: '^backlog$', $options: 'i' },
      })
      .exec();

    return backlogTasks;
  }

  async getSprintCompletionSummary(sprintId: string) {
    const sprint = await this.sprintModel.findById(sprintId);

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    if (!sprint.isCompleted) {
      throw new ForbiddenException('Sprint is not completed');
    }
    const sprintEnd = sprint.endDate || new Date();

    const taskIds = (sprint.tasks || []).map((t) => t.toString());

    if (!taskIds.length) return { completed: [], pending: [], unknown: [] };

    // Get latest status change activity for each task at or before sprint end
    const statusActivities = (await this.activityModel
      .aggregate()
      .match({
        action: ActivityAction.STATUS_CHANGED,
        task: { $in: taskIds.map((id) => new Types.ObjectId(id)) },
        createdAt: { $lte: sprintEnd },
      })
      .sort({ createdAt: -1 })
      .group({ _id: '$task', doc: { $first: '$$ROOT' } })
      .exec()) as StatusActivity[];

    const latestStatusByTask: Record<string, string> = {};
    for (const a of statusActivities) {
      const taskId = a._id.toString();
      const toStatus = a.doc.updatedFields?.status?.to;
      if (toStatus) latestStatusByTask[taskId] = toStatus;
    }

    // Fetch current task docs to fallback on timestamps
    const tasks = await this.taskModel
      .find({ _id: { $in: taskIds } })
      .lean()
      .exec();

    const completed: Task[] = [];
    const pending: Task[] = [];
    const unknown: Task[] = [];

    for (const task of tasks) {
      const id = task._id.toString();

      let statusAtEnd: string | null = null;

      if (latestStatusByTask[id]) {
        statusAtEnd = latestStatusByTask[id];
      } else {
        // If there was no status change before sprint end, but the task wasn't updated after sprint end,
        // we can safely use the current `task.status` as the status at sprint end.
        if (task.updatedAt && new Date(task.updatedAt) <= new Date(sprintEnd)) {
          statusAtEnd = task.status;
        }
      }

      if (!statusAtEnd) {
        unknown.push(task);
        continue;
      }

      if (/done|completed|closed/i.test(statusAtEnd)) {
        completed.push(task);
      } else {
        pending.push(task);
      }
    }

    return { completed, pending, unknown };
  }
}

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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

    // Check if the sprint is being marked as completed
    if (update.isCompleted && !sprint.isCompleted) {
      const taskIds = sprint.tasks || [];
      const tasks = await this.taskModel.find({ _id: { $in: taskIds } }).lean();

      // Save the current statuses of tasks
      const taskStatusesAtCompletion = new Map<string, string>();
      tasks.forEach((task) => {
        taskStatusesAtCompletion.set(task._id.toString(), task.status);
      });

      // Add the task statuses to the update object
      update['taskStatusesAtCompletion'] = taskStatusesAtCompletion;
      update['endDate'] = new Date(); // Set the sprint end date
    }

    const updatedSprint = await this.sprintModel.findByIdAndUpdate(
      sprintId,
      { $set: update },
      { new: true },
    );

    if (!updatedSprint) {
      throw new NotFoundException('Sprint not found');
    }

    this.notificationPushService.pushNotificationToProjectMembers(project._id, {
      title: `Sprint ${sprint.key} Updated`,
      message: `Sprint ${sprint.key} has been updated`,
      projectId: project._id,
    });

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

    this.notificationPushService.pushNotificationToProjectMembers(
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

    this.notificationPushService
      .pushNotificationToProjectMembers(updatedSprint.projectId, {
        title: `Task Removed from sprint ${updatedSprint.key}`,
        message: `A task was removed from sprint ${updatedSprint.key}`,
        projectId: updatedSprint.projectId,
        taskId,
      })
      .catch((err) => {
        console.error('Failed to send notification:', err);
      });

    await this.activityService.logRemovedFromSprint({
      taskId,
      byUserId: userId,
      sprintId: updatedSprint._id,
    });

    return updatedSprint;
  }

  async getTasksRemovedDuringSprint(sprintId: string) {
    const sprint = await this.sprintModel.findById(sprintId);

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    if (!sprint.endDate) {
      throw new ForbiddenException('Sprint not completed');
    }

    // 1️⃣ Find removals for THIS sprint only
    const removedActivities = await this.activityModel.find({
      action: ActivityAction.REMOVED_FROM_SPRINT,
      'updatedFields.sprint.from': sprintId, // no toString needed
      createdAt: {
        $gte: sprint.createdAt,
        $lte: sprint.endDate,
      },
    });

    console.log('Removed activities:', removedActivities.length);

    if (!removedActivities.length) return [];

    // 2️⃣ Unique task IDs
    const removedTaskIds = [...new Set(removedActivities.map((a) => a.task))];

    // 3️⃣ Exclude tasks still inside sprint at completion
    const finalRemovedTaskIds = removedTaskIds.filter(
      (taskId) =>
        !sprint.tasks.some((t) => t.toString() === taskId._id?.toString()),
    );

    if (!finalRemovedTaskIds.length) return [];

    return this.taskModel.find({
      _id: { $in: finalRemovedTaskIds.map((task) => task._id) },
    });
  }

  async getSprintCompletionSummary(sprintId: string) {
    const sprint = await this.sprintModel.findById(sprintId);

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    if (!sprint.isCompleted) {
      throw new ForbiddenException('Sprint is not completed');
    }

    const taskStatusesAtCompletion =
      sprint.taskStatusesAtCompletion || new Map();

    const completed: Task[] = [];
    const pending: Task[] = [];
    const unknown: Task[] = [];

    const taskIds = Array.from(taskStatusesAtCompletion.keys());
    const tasks = await this.taskModel.find({ _id: { $in: taskIds } }).lean();

    for (const task of tasks) {
      const statusAtEnd = taskStatusesAtCompletion.get(task._id.toString());

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

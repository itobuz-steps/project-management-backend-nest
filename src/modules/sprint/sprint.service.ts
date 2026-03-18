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
  ProjectNotificationPayload,
} from './type/sprint.types';
import { ProjectType } from '../project/type/project.types';
import { MailService } from 'src/mail/mail.service';
import { User } from '../auth/schemas/user.schema';
import { ActivityService } from '../activity/services/activity.service';

@Injectable()
export class SprintService {
  constructor(
    @InjectModel(Sprint.name)
    private readonly sprintModel: Model<Sprint>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(Task.name) private readonly taskModel: Model<Task>,
    @InjectModel(Activity.name) private readonly activityModel: Model<Activity>,

    private readonly mailService: MailService,
    private readonly notificationPushService: NotificationPushService,
    private readonly activityService: ActivityService,
  ) {}

  private async notifyProjectMembersWithEmail(
    project: Project,
    payload: ProjectNotificationPayload,
    emailPayload?: {
      template: string;
      subject: string;
      data: unknown;
    },
  ) {
    try {
      await this.notificationPushService.pushNotificationToProjectMembers(
        project._id,
        payload,
      );

      if (emailPayload) {
        const memberIds = project.members.map((m) => m.user);

        const users = await this.userModel.find({
          _id: { $in: memberIds },
          'notificationPreferences.email': true,
        });

        void Promise.all(
          users.map((user) =>
            this.mailService.sendTemplateMail(
              user.email,
              emailPayload.subject,
              emailPayload.template,
              emailPayload.data,
            ),
          ),
        );
      }
    } catch (err) {
      console.error('Sprint notification error:', err);
    }
  }

  async getAllSprints(): Promise<Sprint[]> {
    return this.sprintModel.find().sort({ startDate: 1, createdAt: 1 });
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

    return await this.sprintModel
      .find({ projectId })
      .sort({ startDate: 1, createdAt: 1 });
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

    if (project.projectType === ProjectType.KANBAN) {
      throw new ForbiddenException('Cannot create sprint in a kanban project');
    }

    const sprint = new this.sprintModel({
      ...dto,
      projectId,
      key: `${project.prefix}-sprint-${project.sprintCount + 1}`,
    });

    project.sprintCount += 1;

    await sprint.save();
    await project.save();

    void this.notifyProjectMembersWithEmail(
      project,
      {
        title: `Sprint ${sprint.key} Created`,
        message: `Sprint ${sprint.key} has been created`,
        projectId: project._id,
      },
      {
        template: 'sprint-update',
        subject: 'Sprint Created',
        data: {
          sprintTitle: 'Sprint Created',
          sprintKey: sprint.key,
          projectName: project.name,
          action: 'A new sprint has been created.',
        },
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

    const wasStarted = sprint.isStarted;
    const wasCompleted = sprint.isCompleted;

    const project = await getProjectWithAccess(this.projectModel, {
      projectId,
      userId,
      role,
    });

    if (!project) {
      throw new ForbiddenException('Unauthorized');
    }

    if (update.isStarted && !sprint.isStarted) {
      update['startDate'] = update.startDate
        ? new Date(update.startDate)
        : new Date();
      update['isStarted'] = true;
    }
    if (update.startDate && !sprint.startDate) {
      update['startDate'] = new Date(update.startDate);
      update['isStarted'] = true;
    }

    if (update.isCompleted && !sprint.isCompleted) {
      const taskIds = sprint.tasks || [];
      const tasks = await this.taskModel.find({ _id: { $in: taskIds } }).lean();

      const taskStatusesAtCompletion = new Map<string, string>();
      tasks.forEach((task) => {
        taskStatusesAtCompletion.set(task._id.toString(), task.status);
      });

      update['taskStatusesAtCompletion'] = taskStatusesAtCompletion;
      update['endDate'] = new Date();
    }

    const updatedSprint = await this.sprintModel.findByIdAndUpdate(
      sprintId,
      { $set: update },
      { new: true },
    );

    if (!updatedSprint) {
      throw new NotFoundException('Sprint not found');
    }

    if (!wasStarted && update.isStarted) {
      void this.notifyProjectMembersWithEmail(
        project,
        {
          title: `Sprint ${sprint.key} Started`,
          message: `Sprint ${sprint.key} has been started`,
          projectId: project._id,
        },
        {
          template: 'sprint-update',
          subject: 'Sprint Started',
          data: {
            sprintTitle: 'Sprint Started',
            sprintKey: sprint.key,
            projectName: project.name,
            action: 'Sprint details have been started.',
          },
        },
      );
    }

    if (!wasCompleted && update.isCompleted) {
      void this.notifyProjectMembersWithEmail(
        project,
        {
          title: `Sprint ${sprint.key} Completed`,
          message: `Sprint ${sprint.key} has been completed`,
          projectId: project._id,
        },
        {
          template: 'sprint-update',
          subject: 'Sprint Completed',
          data: {
            sprintTitle: 'Sprint Completed',
            sprintKey: sprint.key,
            projectName: project.name,
            action: 'Sprint details have been completed.',
          },
        },
      );
    }

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

    void this.notifyProjectMembersWithEmail(
      project,
      {
        title: `Sprint ${sprint.key} Deleted`,
        message: `Sprint ${sprint.key} has been deleted`,
        projectId: project._id,
      },
      {
        template: 'sprint-delete',
        subject: 'Sprint Deleted',
        data: {
          sprintKey: sprint.key,
          projectName: project.name,
        },
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

    void this.notifyProjectMembersWithEmail(
      project,
      {
        title: `${tasks.length} task(s) added to sprint ${updatedSprint.key}`,
        message: `${tasks.length} task(s) added to sprint ${updatedSprint.key}`,
        projectId: project._id,
      },
      {
        template: 'sprint-tasks',
        subject: 'Tasks Added to Sprint',
        data: {
          sprintKey: updatedSprint.key,
          projectName: project.name,
          changeText: `${tasks.length} task(s) added to the sprint.`,
        },
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

    void this.notifyProjectMembersWithEmail(
      project,
      {
        title: `Task Removed from sprint ${updatedSprint.key}`,
        message: `A task was removed from sprint ${updatedSprint.key}`,
        projectId: project._id,
      },
      {
        template: 'sprint-tasks',
        subject: 'Task Removed from Sprint',
        data: {
          sprintKey: updatedSprint.key,
          projectName: project.name,
          changeText: `A task was removed from the sprint.`,
        },
      },
    );

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

    const sprintStart = sprint.startDate || sprint.createdAt;

    const removedActivities = await this.activityModel.find({
      action: ActivityAction.REMOVED_FROM_SPRINT,
      'updatedFields.sprint.from': sprintId,
      createdAt: {
        $gte: sprintStart,
        $lte: sprint.endDate,
      },
    });

    if (!removedActivities.length) {
      return [];
    }

    const removedTaskIds = [...new Set(removedActivities.map((a) => a.task))];

    const finalRemovedTaskIds = removedTaskIds.filter(
      (taskId) =>
        !sprint.tasks.some(
          (task) => task.toString() === taskId._id?.toString(),
        ),
    );

    if (!finalRemovedTaskIds.length) {
      return [];
    }

    return this.taskModel.find({
      _id: { $in: finalRemovedTaskIds.map((task) => task._id) },
    });
  }

  async getSprintCompletionSummary(sprintId: string, projectId: string) {
    const sprint = await this.sprintModel.findById(sprintId);

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    if (!sprint.isCompleted) {
      throw new ForbiddenException('Sprint is not completed');
    }

    const project = await this.projectModel.findById(projectId);

    if (!project || !project.columns?.length) {
      throw new ForbiddenException('Project workflow not configured');
    }

    const lastColumn = project.columns[project.columns.length - 1];

    const taskStatusesAtCompletion =
      sprint.taskStatusesAtCompletion || new Map();

    const completed: Task[] = [];
    const pending: Task[] = [];

    const taskIds = Array.from(taskStatusesAtCompletion.keys());

    const tasks = await this.taskModel.find({ _id: { $in: taskIds } }).lean();

    for (const task of tasks) {
      const statusAtEnd = taskStatusesAtCompletion.get(task._id.toString());

      if (statusAtEnd === lastColumn) {
        completed.push(task);
      } else {
        pending.push(task);
      }
    }
    return { completed, pending };
  }
}

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
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
import { ConfigService } from '@nestjs/config';
import { AppConfig } from 'src/config/app.config';
import { format, eachDayOfInterval, isWeekend } from 'date-fns';
import { DayPoint, ScopeChange, AggResult } from './type/chartTypes';

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
    private readonly configService: ConfigService<AppConfig>,
  ) {}

  private buildProjectUrl(projectId: string) {
    const baseUrl = this.configService.get<string>('FRONTEND_URL');

    if (!baseUrl) {
      throw new Error('FRONTEND_URL is not defined');
    }

    return `${baseUrl}/project/${projectId}/backlog`;
  }

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
      .find({ projectId: new mongoose.Types.ObjectId(projectId) })
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
          projectUrl: this.buildProjectUrl(project._id.toString()),
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
            projectUrl: this.buildProjectUrl(project._id.toString()),
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
            projectUrl: this.buildProjectUrl(project._id.toString()),
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
          projectUrl: this.buildProjectUrl(project._id.toString()),
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
          projectUrl: this.buildProjectUrl(project._id.toString()),
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
          projectUrl: this.buildProjectUrl(project._id.toString()),
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

  async getBurndown(sprintId: string) {
    const sprint = await this.sprintModel.findById(sprintId).lean();

    if (!sprint) {
      throw new NotFoundException(`Sprint ${sprintId} not found`);
    }

    if (!sprint.startDate) {
      throw new NotFoundException(`Sprint ${sprintId} has not started`);
    }

    const startDate = new Date(sprint.startDate);
    const endDate = sprint.dueDate ? new Date(sprint.dueDate) : new Date();

    const workingDays = eachDayOfInterval({ start: startDate, end: endDate })
      .filter((d) => !isWeekend(d))
      .map((d) => format(d, 'dd-MM-yyyy'));

    const totalDays = workingDays.length;
    const initialScope = sprint.storyPoint;

    const doneTaskIds = Object.entries(sprint.taskStatusesAtCompletion)
      .filter(([, status]) => status === 'done')
      .map(([id]) => new Types.ObjectId(id));

    const completionAgg = await this.taskModel.aggregate<AggResult>([
      { $match: { _id: { $in: doneTaskIds } } },
      {
        $group: {
          _id: { $dateToString: { format: '%d-%m-%Y', date: '$updatedAt' } },
          points: { $sum: '$storyPoint' },
        },
      },
    ]);

    const scopeAgg = await this.taskModel.aggregate<AggResult>([
      {
        $match: { _id: { $in: sprint.tasks }, createdAt: { $gt: startDate } },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%d-%m-%Y', date: '$createdAt' } },
          points: { $sum: '$storyPoint' },
        },
      },
    ]);

    const completedByDay: Record<string, number> = Object.fromEntries(
      completionAgg.map((r) => [r._id, r.points]),
    );

    const scopeByDay: Record<string, number> = Object.fromEntries(
      scopeAgg.map((r) => [r._id, r.points]),
    );

    const currentScope =
      initialScope + scopeAgg.reduce((sum, r) => sum + r.points, 0);

    let actualRemaining = initialScope;

    const series: DayPoint[] = [];
    const scopeChanges: ScopeChange[] = [];

    for (let d = 0; d < totalDays; d++) {
      const date = workingDays[d];
      const ideal = Math.max(
        0,
        Math.round(currentScope * (1 - d / (totalDays - 1))),
      );
      const scopeAdded = scopeByDay[date] ?? 0;
      const completed = completedByDay[date] ?? 0;

      actualRemaining = Math.max(0, actualRemaining + scopeAdded - completed);

      series.push({
        date,
        ideal,
        actual: actualRemaining,
        completed,
        scopeAdded,
      });

      if (scopeAdded > 0) {
        scopeChanges.push({
          date,
          pointsAdded: scopeAdded,
          actual: actualRemaining,
        });
      }
    }

    const todayKey = format(new Date(), 'dd-MM-yyyy');

    const todayEntry =
      series.find((s) => s.date === todayKey) ?? series[series.length - 1];

    const completedTotal = completionAgg.reduce((sum, r) => sum + r.points, 0);

    const variance = todayEntry.actual - todayEntry.ideal;

    const variancePct =
      currentScope > 0 ? Math.round((variance / currentScope) * 100) : 0;

    const status =
      variancePct <= 15 ? 'on_track' : variancePct <= 30 ? 'at_risk' : 'behind';

    return {
      sprint: {
        id: sprintId,
        key: sprint.key,
        startDate: format(startDate, 'dd-MM-yyyy'),
        endDate: format(endDate, 'dd-MM-yyyy'),
        totalWorkingDays: totalDays,
      },
      summary: {
        initialScope,
        currentScope,
        completedPoints: completedTotal,
        remainingPoints: actualRemaining,
        percentComplete:
          currentScope > 0
            ? Math.round((completedTotal / currentScope) * 100)
            : 0,
        status,
        variance,
        variancePct,
      },
      series,
      scopeChanges,
    };
  }
}

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
  ProjectEmailPayload,
} from './type/sprint.types';
import { MailService } from 'src/utils/sendVerificationMail';
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
    emailPayload?: ProjectEmailPayload,
  ) {
    try {
      await this.notificationPushService.pushNotificationToProjectMembers(
        project._id,
        payload,
      );

      // 📧 Email
      if (emailPayload) {
        const memberIds = project.members.map((m) => m.user);

        const users = await this.userModel.find({
          _id: { $in: memberIds },
          'notificationPreferences.email': true,
        });

        void Promise.all(
          users.map((user) =>
            this.mailService.sendNotificationMail(
              user.email,
              emailPayload.subject,
              {
                title: emailPayload.title,
                message: payload.message,
                highlightText: emailPayload.highlightText,
                projectName: project.name,
              },
            ),
          ),
        );
      }
    } catch (err) {
      console.error('Sprint notification error:', err);
    }
  }

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

    void this.notifyProjectMembersWithEmail(
      project,
      {
        title: `Sprint ${sprint.key} Created`,
        message: `Sprint ${sprint.key} has been created`,
        projectId: project._id,
      },
      {
        subject: `Sprint Created`,
        title: `Sprint ${sprint.key} Created`,
        highlightText: `Sprint ${sprint.key}`,
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

    void this.notifyProjectMembersWithEmail(
      project,
      {
        title: `Sprint ${sprint.key} Updated`,
        message: `Sprint ${sprint.key} has been updated`,
        projectId: project._id,
      },
      {
        subject: `Sprint Updated`,
        title: `Sprint ${sprint.key} Updated`,
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

    void this.notifyProjectMembersWithEmail(
      project,
      {
        title: `Sprint ${sprint.key} Deleted`,
        message: `Sprint ${sprint.key} has been deleted`,
        projectId: project._id,
      },
      {
        subject: `Sprint Deleted`,
        title: `Sprint ${sprint.key} Deleted`,
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
        subject: `Tasks Added to Sprint`,
        title: `Tasks Added to ${updatedSprint.key}`,
        highlightText: `${tasks.length} task(s) added`,
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
        subject: `Task Removed from Sprint`,
        title: `Task Removed from ${updatedSprint.key}`,
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

    const removedActivities = await this.activityModel.find({
      action: ActivityAction.REMOVED_FROM_SPRINT,
      'updatedFields.sprint.from': sprintId,
      createdAt: {
        $gte: sprint.createdAt,
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

import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Types } from 'mongoose';
import mongoose, { HydratedDocument, Model, PipelineStage } from 'mongoose';
import { Task } from './entities/task.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Project } from '../project/schema/project.schema';
import type { ObjectIdLike } from 'src/type/common.type';
import {
  ProjectNotificationPayload,
  TaskFilters,
  TaskStats,
  TRACKABLE_TASK_FIELDS,
  UserEmailPayload,
} from './interfaces/tasks.interface';
import { NotificationPushService } from '../notification/services/notification-push.service';
import { ActivityService } from '../activity/services/activity.service';
import { Role } from '../auth/types/auth.types';
import { StorageService } from 'src/storage/storage.service';
import { User } from '../auth/schemas/user.schema';
import { MailService } from 'src/utils/sendVerificationMail';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<Task>,
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly activityService: ActivityService,
    private readonly notificationPushService: NotificationPushService,
    private readonly storageService: StorageService,
    private readonly mailService: MailService,
  ) {}

  private async notifyUserWithPreferences(
    userId: ObjectIdLike,
    payload: ProjectNotificationPayload,
    emailPayload?: UserEmailPayload,
  ) {
    try {
      await this.notificationPushService.pushNotificationToUser(
        userId,
        payload,
      );

      if (emailPayload) {
        const user = await this.userModel.findById(userId);

        if (user?.notificationPreferences?.email && user.email) {
          await this.mailService.sendNotificationMail(
            user.email,
            payload.title,
            {
              title: payload.message,
              message: payload.message,
              highlightText: emailPayload.highlightText,
              projectName: emailPayload.projectName,
            },
          );
        }
      }
    } catch (err) {
      console.error('Notification error:', err);
    }
  }

  async create(
    userId: ObjectIdLike,
    role: Role,
    createTaskDto: CreateTaskDto,
    files: Express.Multer.File[] = [],
  ) {
    const project = await this.checkMembership(
      userId,
      role,
      createTaskDto.projectId,
    );

    // Prepare task data and filter out invalid assignee values
    const taskData = { ...createTaskDto };
    if (!taskData.assignee || taskData.assignee === '') {
      delete taskData.assignee;
    }

    let uploadRes: Awaited<
      ReturnType<typeof this.storageService.uploadMultipleFiles>
    > | null = null;

    if (files && files.length) {
      const uploadResults =
        await this.storageService.uploadMultipleFiles(files);
      uploadRes = uploadResults;
    }

    console.log(uploadRes);

    const newTask = await this.taskModel.create({
      ...taskData,
      reporter: userId,
      key: `${project.prefix}-${project.lastKey + 1}`,
      attachments: uploadRes ? uploadRes.map((res) => res.url) : [],
    });

    project.lastKey += 1;

    await project.save();

    // Log task creation activity
    await this.activityService.logTaskCreated({
      taskId: newTask._id.toString(),
      byUserId: userId.toString(),
      taskTitle: newTask.title,
    });

    // Log assignee activity if task is assigned
    if (newTask.assignee) {
      await this.activityService.logAssigneeChange({
        taskId: newTask._id.toString(),
        byUserId: userId.toString(),
        newAssigneeId: newTask.assignee.toString(),
      });
    }

    // Send notification to assignee if task is assigned
    if (newTask.assignee && newTask.assignee.toString() !== userId.toString()) {
      void this.notifyUserWithPreferences(
        newTask.assignee,
        {
          title: `New Task Assigned: "${newTask.title}"`,
          message: `You have been assigned to task "${newTask.title}" in project "${project.name}"`,
          projectId: newTask.projectId,
          taskId: newTask._id,
        },
        {
          projectName: project.name,
        },
      );
    }

    return newTask;
  }

  async findAll(userId: ObjectIdLike, role: Role, filter: TaskFilters = {}) {
    const pipeline: PipelineStage[] = [];

    if (role === Role.SUPERADMIN) {
      if (filter.projectId) {
        pipeline.push({
          $match: {
            projectId: new mongoose.Types.ObjectId(filter.projectId),
          },
        });
      } else {
        const projectIds = await this.projectModel.find({}, { _id: 1 });

        pipeline.push({
          $match: { projectId: { $in: projectIds.map((p) => p._id) } },
        });
      }
    } else {
      if (filter.projectId) {
        const project = await this.projectModel.findOne({
          _id: filter.projectId,
          'members.user': userId,
        });

        if (!project) {
          throw new UnauthorizedException(
            'User is not a member of the specified project',
          );
        }

        pipeline.push({
          $match: {
            projectId: new mongoose.Types.ObjectId(filter.projectId),
          },
        });
      } else {
        const projectIds = await this.projectModel.find(
          { 'members.user': userId },
          { _id: 1 },
        );
        pipeline.push({
          $match: { projectId: { $in: projectIds.map((p) => p._id) } },
        });
      }
    }

    if (filter.searchQuery) {
      pipeline.push({
        $match: {
          $or: [
            { title: { $regex: filter.searchQuery, $options: 'i' } },
            { description: { $regex: filter.searchQuery, $options: 'i' } },
            { key: { $regex: filter.searchQuery, $options: 'i' } },
          ],
        },
      });
    }

    if (filter.priority) {
      pipeline.push({
        $match: {
          priority: filter.priority,
        },
      });
    }

    if (filter.status) {
      pipeline.push({
        $match: {
          status: filter.status,
        },
      });
    }

    if (filter.tags instanceof Array && filter.tags && filter.tags.length) {
      pipeline.push({
        $match: {
          tags: { $in: filter.tags },
        },
      });
    } else if (typeof filter.tags === 'string' && filter.tags.length) {
      pipeline.push({
        $match: {
          tags: { $in: [filter.tags] },
        },
      });
    }

    if (filter.assignee) {
      pipeline.push({
        $match: {
          assignee: new mongoose.Types.ObjectId(filter.assignee),
        },
      });
    }

    if (filter.sortBy) {
      const sortOrder = filter.sortOrder === 'asc' ? 1 : -1;
      pipeline.push({
        $sort: {
          [filter.sortBy]: sortOrder,
        },
      });
    } else {
      pipeline.push({
        $sort: {
          createdAt: -1,
        },
      });
    }

    // Populate assignee
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'assignee',
        foreignField: '_id',
        as: 'assignee',
      },
    });
    pipeline.push({
      $unwind: {
        path: '$assignee',
        preserveNullAndEmptyArrays: true,
      },
    });

    // Populate reporter
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'reporter',
        foreignField: '_id',
        as: 'reporter',
      },
    });
    pipeline.push({
      $unwind: {
        path: '$reporter',
        preserveNullAndEmptyArrays: true,
      },
    });

    const result =
      await this.taskModel.aggregate<HydratedDocument<Task>>(pipeline);

    return result;
  }

  async findOne(userId: ObjectIdLike, role: Role, id: string) {
    const task = await this.taskModel
      .findById(id)
      .populate('assignee', 'name email')
      .populate('reporter', 'name email');

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (role === Role.SUPERADMIN) {
      return task;
    }

    const project = await this.projectModel.findOne({
      _id: task.projectId,
      'members.user': userId,
    });

    if (!project) {
      throw new UnauthorizedException('User is not a member of this project');
    }

    return task;
  }

  async update(
    userId: ObjectIdLike,
    role: Role,
    id: ObjectIdLike,
    updateTaskDto: UpdateTaskDto,
  ) {
    const task = await this.taskModel.findById(id);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.checkMembership(userId, role, task.projectId);

    type UpdateDataType = Omit<UpdateTaskDto, 'assignee'> & {
      assignee?: Types.ObjectId | null;
    };

    const { assignee, ...rest } = updateTaskDto;

    const updateData: UpdateDataType = {
      ...rest,
    };

    if (assignee !== undefined) {
      updateData.assignee = assignee ? new Types.ObjectId(assignee) : null;
    }

    Object.keys(updateData).forEach((key) => {
      if (updateData[key as keyof UpdateDataType] === undefined) {
        delete updateData[key as keyof UpdateDataType];
      }
    });

    const updatedTask = await this.taskModel
      .findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      })
      .populate('assignee', 'name email')
      .populate('reporter', 'name email');

    if (updateTaskDto.status && task.status !== updateTaskDto.status) {
      await this.activityService.logStatusChange({
        taskId: task._id.toString(),
        byUserId: userId.toString(),
        oldStatus: task.status,
        newStatus: updateTaskDto.status,
      });
    }
    if (updateTaskDto.assignee) {
      const oldAssigneeId = task.assignee?.toString() || null;
      const newAssigneeId = updateData.assignee?.toString() || null;

      if (oldAssigneeId !== newAssigneeId) {
        const newAssignee = updateData.assignee
          ? await this.projectModel.db.collection('users').findOne(
              { _id: updateData.assignee },

              { projection: { name: 1 } },
            )
          : null;
        console.log('New Assignee Details:', newAssignee);

        await this.activityService.logAssigneeChange({
          taskId: task._id.toString(),
          byUserId: userId.toString(),
          newAssigneeId: updateData.assignee?.toString() ?? null,
        });
      }
    }

    const trackableFields = [
      ...TRACKABLE_TASK_FIELDS,
    ] as (keyof UpdateTaskDto)[];

    const changes: { field: string; oldValue: string; newValue: string }[] = [];

    for (const field of trackableFields) {
      if (updateTaskDto[field]) {
        const oldVal = String(task[field] ?? '');
        const newVal = String(updateTaskDto[field] ?? '');

        if (oldVal !== newVal) {
          changes.push({
            field,
            oldValue: oldVal,
            newValue: newVal,
          });
        }
      }
    }

    if (changes.length) {
      await this.activityService.logTaskUpdated({
        taskId: task._id.toString(),
        byUserId: userId.toString(),
        changes,
      });
    }

    if (
      updateData.assignee &&
      task.assignee?.toString() !== updateData.assignee.toString() &&
      updateData.assignee.toString() !== userId.toString()
    ) {
      void this.notifyUserWithPreferences(
        updateTaskDto.assignee as ObjectIdLike,
        {
          title: `Task Assigned: "${task.title}"`,
          message: `You have been assigned to task "${task.title}"`,
          projectId: task.projectId,
          taskId: task._id,
        },
        {
          projectName:
            (await this.projectModel.findById(task.projectId))?.name || '',
        },
      );
    }

    if (updateTaskDto.status && task.status !== updateTaskDto.status) {
      const usersToNotify = new Set<string>();

      if (task.assignee && task.assignee.toString() !== userId.toString()) {
        usersToNotify.add(task.assignee.toString());
      }

      if (task.reporter.toString() !== userId.toString()) {
        usersToNotify.add(task.reporter.toString());
      }

      void Promise.all(
        Array.from(usersToNotify).map(async (notifyUserId) => {
          const project = await this.projectModel.findById(task.projectId);

          return this.notifyUserWithPreferences(
            notifyUserId,
            {
              title: `Task Status Updated: "${task.title}"`,
              message: `Task "${task.title}" status changed from "${task.status}" to "${updateTaskDto.status}"`,
              projectId: task.projectId,
              taskId: task._id,
            },
            {
              projectName: project?.name || '',
            },
          );
        }),
      );
    }

    return updatedTask;
  }

  async delete(userId: ObjectIdLike, role: Role, id: string) {
    const task = await this.taskModel.findById(id);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.checkMembership(userId, role, task.projectId);

    // Notify assignee and reporter about task deletion
    const usersToNotify = new Set<string>();
    if (task.assignee && task.assignee.toString() !== userId.toString()) {
      usersToNotify.add(task.assignee.toString());
    }
    if (task.reporter.toString() !== userId.toString()) {
      usersToNotify.add(task.reporter.toString());
    }

    void Promise.all(
      Array.from(usersToNotify).map(async (notifyUserId) => {
        const project = await this.projectModel.findById(task.projectId);

        return this.notifyUserWithPreferences(
          notifyUserId,
          {
            title: `Task Deleted: "${task.title}"`,
            message: `Task "${task.title}" has been deleted`,
            projectId: task.projectId,
          },
          {
            projectName: project?.name || '',
          },
        );
      }),
    );

    const deletedTask = await this.taskModel
      .findByIdAndDelete(id)
      .populate('assignee', 'name email')
      .populate('reporter', 'name email');

    return deletedTask;
  }

  async checkMembership(
    userId: ObjectIdLike,
    role: Role,
    projectId: ObjectIdLike,
  ) {
    if (role === Role.SUPERADMIN) {
      const project = await this.projectModel.findOne({
        _id: projectId,
      });

      if (!project) {
        throw new NotFoundException('Project not found');
      }

      return project;
    }

    const project = await this.projectModel.findOne({
      _id: projectId,
      'members.user': userId,
    });

    if (!project) {
      throw new UnauthorizedException('User is not a member of this project');
    }

    return project;
  }

  async getStats(userId: ObjectIdLike) {
    console.log('Getting task stats for user:', userId);

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const pipeline: PipelineStage[] = [];

    // Stage 1: Find tasks assigned to the user
    pipeline.push({
      $match: {
        assignee: new mongoose.Types.ObjectId(userId.toString()),
      },
    });

    // Stage 2: Populate project details
    pipeline.push({
      $lookup: {
        from: 'projects',
        localField: 'projectId',
        foreignField: '_id',
        as: 'project',
      },
    });

    pipeline.push({
      $unwind: {
        path: '$project',
        preserveNullAndEmptyArrays: false,
      },
    });

    // Stage 3: Get the last column (done status) from project.columns
    pipeline.push({
      $addFields: {
        doneStatus: { $arrayElemAt: ['$project.columns', -1] },
      },
    });

    // Stage 4: Lookup activity logs for each task (STATUS_CHANGED only, within last week)
    pipeline.push({
      $lookup: {
        from: 'activities',
        let: { taskId: '$_id', doneStatus: '$doneStatus' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$task', '$$taskId'] },
                  { $eq: ['$action', 'STATUS_CHANGED'] },
                  { $gte: ['$createdAt', oneWeekAgo] },
                  { $eq: ['$updatedFields.status.to', '$$doneStatus'] },
                ],
              },
            },
          },
          // Sort descending to get the latest status change first
          { $sort: { createdAt: -1 } },
          // Take only the last (most recent) transition to done
          { $limit: 1 },
        ],
        as: 'doneActivities',
      },
    });

    // Stage 5: Keep only tasks that have at least one "moved to done" activity this week
    pipeline.push({
      $addFields: {
        lastDoneActivity: { $arrayElemAt: ['$doneActivities', 0] },
      },
    });

    // Stage 6: Group to get the count of tasks completed this week
    pipeline.push({
      $facet: {
        // All tasks assigned to user (with project populated)
        allTasks: [
          {
            $project: {
              _id: 1,
              title: 1,
              key: 1,
              status: 1,
              priority: 1,
              project: {
                _id: '$project._id',
                name: '$project.name',
                prefix: '$project.prefix',
                columns: '$project.columns',
              },
              doneStatus: 1,
              lastDoneActivity: 1,
            },
          },
        ],
        allTasksGroupedByProject: [
          {
            $project: {
              _id: 1,
              title: 1,
              key: 1,
              status: 1,
              priority: 1,
              project: {
                _id: '$project._id',
                name: '$project.name',
                prefix: '$project.prefix',
                columns: '$project.columns',
              },
              doneStatus: 1,
              lastDoneActivity: 1,
            },
          },
          {
            $group: {
              _id: '$project.name',
              tasks: {
                $push: {
                  _id: '$_id',
                  title: '$title',
                  key: '$key',
                  status: '$status',
                  completedAt: '$completedAt',
                },
              },
            },
          },
        ],
        // Count of tasks that moved to done status in the last week
        completedThisWeek: [
          {
            $match: {
              'doneActivities.0': { $exists: true },
            },
          },
          {
            $count: 'count',
          },
        ],
        // Total story points of tasks completed this week
        storyPointsCompletedThisWeek: [
          {
            $match: {
              'doneActivities.0': { $exists: true },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: { $ifNull: ['$storyPoint', 0] } },
            },
          },
        ],
        // Daily count of tasks completed in the last week
        tasksCompletedEachDay: [
          {
            $match: {
              'doneActivities.0': { $exists: true },
            },
          },
          {
            $project: {
              date: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$lastDoneActivity.createdAt',
                },
              },
            },
          },
          {
            $group: {
              _id: '$date',
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              date: '$_id',
              count: 1,
            },
          },
          {
            $sort: { date: 1 },
          },
        ],
        // Detailed list of tasks completed this week
        completedTasksGroupedByProject: [
          {
            $match: {
              'doneActivities.0': { $exists: true },
            },
          },
          {
            $project: {
              _id: 1,
              title: 1,
              key: 1,
              status: 1,
              projectName: '$project.name',
              completedAt: '$lastDoneActivity.createdAt',
            },
          },
          {
            $group: {
              _id: '$projectName',
              tasks: {
                $push: {
                  _id: '$_id',
                  title: '$title',
                  key: '$key',
                  status: '$status',
                  completedAt: '$completedAt',
                },
              },
            },
          },
        ],
      },
    });

    // Stage 7: Reshape the output
    pipeline.push({
      $project: {
        totalAssignedTasks: { $size: '$allTasks' },
        tasksCompletedThisWeek: {
          $ifNull: [{ $arrayElemAt: ['$completedThisWeek.count', 0] }, 0],
        },
        storyPointsCompletedThisWeek: {
          $ifNull: [
            { $arrayElemAt: ['$storyPointsCompletedThisWeek.total', 0] },
            0,
          ],
        },
        tasksCompletedEachDay: {
          $ifNull: ['$tasksCompletedEachDay', []],
        },
        allTasksGroupedByProject: 1,
        completedTasksGroupedByProject: 1,
      },
    });

    const result = await this.taskModel.aggregate<TaskStats>(pipeline).exec();

    console.log(
      'Task stats aggregation result:',
      JSON.stringify(result, null, 2),
    );

    return (
      result[0] ?? {
        totalAssignedTasks: 0,
        tasksCompletedThisWeek: 0,
        storyPointsCompletedThisWeek: 0,
        tasksCompletedEachDay: [],
        allTasksGroupedByProject: [],
        completedTasksGroupedByProject: [],
      }
    );
  }
}

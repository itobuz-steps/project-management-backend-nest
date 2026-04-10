import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { GetAllTasksDto } from './dto/get-all-tasks.dto';
import { Types } from 'mongoose';
import mongoose, { Model, PipelineStage } from 'mongoose';
import { Task } from './entities/task.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Project } from '../project/schema/project.schema';
import type { ObjectIdLike } from 'src/type/common.type';
import {
  ProjectNotificationPayload,
  TaskStats,
  TRACKABLE_TASK_FIELDS,
} from './interfaces/tasks.interface';
import { NotificationPushService } from '../notification/services/notification-push.service';
import { ActivityService } from '../activity/services/activity.service';
import { Role } from '../auth/types/auth.types';
import { StorageService } from 'src/storage/storage.service';
import { User } from '../auth/schemas/user.schema';
import { MailService } from 'src/mail/mail.service';
import { Worklog } from './entities/worklog.entity';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from 'src/config/app.config';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<Task>,
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Worklog.name) private readonly worklogModel: Model<Worklog>,
    private readonly activityService: ActivityService,
    private readonly notificationPushService: NotificationPushService,
    private readonly storageService: StorageService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService<AppConfig>,
  ) {}

  private buildTaskUrl(taskId: string) {
    const baseUrl = this.configService.get<string>('FRONTEND_URL');

    if (!baseUrl) {
      throw new Error('FRONTEND_URL is not defined');
    }

    return `${baseUrl}/task/${taskId}`;
  }

  private async notifyUserWithPreferences(
    userId: ObjectIdLike,
    payload: ProjectNotificationPayload,
    emailOptions?: {
      template: string;
      subject: string;
      data: unknown;
    },
  ) {
    try {
      await this.notificationPushService.pushNotificationToUser(
        userId,
        payload,
      );

      if (emailOptions) {
        const user = await this.userModel.findById(userId);

        if (user?.notificationPreferences?.email && user.email) {
          await this.mailService.sendTemplateMail(
            user.email,
            emailOptions.subject,
            emailOptions.template,
            emailOptions.data,
          );
        }
      }
    } catch (err) {
      console.error('Notification error:', err);
    }
  }

  private async syncLinkedTasks(task: Task, updateTaskDto: UpdateTaskDto) {
    const relations = [
      { field: 'blocks', inverse: 'blockedBy' },
      { field: 'blockedBy', inverse: 'blocks' },
      { field: 'relatesTo', inverse: 'relatesTo' },
      { field: 'duplicates', inverse: 'duplicates' },
    ] as const;

    for (const { field, inverse } of relations) {
      const newIds = updateTaskDto[field];

      if (!newIds) {
        continue;
      }

      const oldIds = (task[field] ?? []).map((id: Types.ObjectId) =>
        id.toString(),
      );

      const newIdStrings = newIds.map((id: ObjectIdLike) => id.toString());

      const added = newIdStrings.filter((id) => !oldIds.includes(id));
      const removed = oldIds.filter((id) => !newIdStrings.includes(id));

      if (added.length) {
        await this.taskModel.updateMany(
          { _id: { $in: added } },
          {
            $addToSet: {
              [inverse]: task._id,
            },
          },
        );
      }

      if (removed.length) {
        await this.taskModel.updateMany(
          { _id: { $in: removed } },
          {
            $pull: {
              [inverse]: task._id,
            },
          },
        );
      }
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

    const actor = await this.userModel.findById(userId);

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

    const newTask = await this.taskModel.create({
      ...taskData,
      reporter: userId,
      key: `${project.prefix}-${project.lastKey + 1}`,
      attachments: uploadRes ?? [],
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
          template: 'assignee',
          subject: 'New Task Assigned',
          data: {
            taskKey: newTask.key,
            taskTitle: newTask.title,
            projectName: project.name,
            actorName: actor?.name || 'Someone',
            taskUrl: this.buildTaskUrl(newTask._id.toString()),
          },
        },
      );
    }

    return newTask;
  }

  async findAll(userId: ObjectIdLike, role: Role, filter: GetAllTasksDto = {}) {
    const page = Number(filter.page || 1);
    const limit = Number(filter.limit || 10);
    const skip = (page - 1) * limit;

    const match: Record<string, unknown> = {};

    let projectIds: mongoose.Types.ObjectId[] = [];

    if (role === Role.SUPERADMIN) {
      if (filter.projectId) {
        projectIds = [new mongoose.Types.ObjectId(filter.projectId)];
      } else {
        const projects = await this.projectModel.find({}, { _id: 1 });
        projectIds = projects.map((p) => p._id);
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

        projectIds = [new mongoose.Types.ObjectId(filter.projectId)];
      } else {
        const projects = await this.projectModel.find(
          { 'members.user': userId },
          { _id: 1 },
        );
        projectIds = projects.map((p) => p._id);
      }
    }

    match.projectId = { $in: projectIds };

    if (filter.searchQuery) {
      match.$or = [
        { title: { $regex: filter.searchQuery, $options: 'i' } },
        { description: { $regex: filter.searchQuery, $options: 'i' } },
        { key: { $regex: filter.searchQuery, $options: 'i' } },
      ];
    }

    if (filter.priority?.length) {
      match.priority = { $in: filter.priority };
    }

    if (filter.status?.length) {
      match.status = { $in: filter.status };
    }

    if (filter.type?.length) {
      match.type = { $in: filter.type };
    }

    if (filter.tags?.length) {
      match.tags = { $in: filter.tags };
    }

    if (filter.assignee?.length) {
      match.assignee = {
        $in: filter.assignee.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    if (filter.reporter?.length) {
      match.reporter = {
        $in: filter.reporter.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    const sortStage: PipelineStage.Sort = {
      $sort: filter.sortBy
        ? { [filter.sortBy]: filter.sortOrder === 'asc' ? 1 : -1 }
        : { createdAt: -1 },
    };

    const pipeline: PipelineStage[] = [
      { $match: match },
      sortStage,
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'assignee',
          foreignField: '_id',
          as: 'assignee',
          pipeline: [{ $project: { name: 1, email: 1, profileImage: 1 } }],
        },
      },
      { $unwind: { path: '$assignee', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'reporter',
          foreignField: '_id',
          as: 'reporter',
          pipeline: [{ $project: { name: 1, email: 1, profileImage: 1 } }],
        },
      },
      { $unwind: { path: '$reporter', preserveNullAndEmptyArrays: true } },
    ];

    const [data, totalResult] = await Promise.all([
      this.taskModel.aggregate(pipeline),
      this.taskModel.aggregate<{ total: number }>([
        { $match: match },
        { $count: 'total' },
      ]),
    ]);

    const total = totalResult[0]?.total ?? 0;
    const totalPages = total ? Math.ceil(total / limit) : 0;

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async findOne(userId: ObjectIdLike, role: Role, id: string) {
    const task = await this.taskModel
      .findById(id)
      .populate('assignee', 'name email profileImage')
      .populate('reporter', 'name email profileImage')
      .populate('blocks', 'title key status type')
      .populate('blockedBy', 'title key status type')
      .populate('relatesTo', 'title key status type')
      .populate('duplicates', 'title key status type');

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
    newFiles: Express.Multer.File[] = [],
  ) {
    const task = await this.taskModel.findById(id);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.checkMembership(userId, role, task.projectId);

    const actor = await this.userModel.findById(userId);

    await this.syncLinkedTasks(task, updateTaskDto);

    type UpdateDataType = Omit<UpdateTaskDto, 'assignee' | 'reporter'> & {
      assignee?: Types.ObjectId | null;
      reporter?: Types.ObjectId;
    };

    const { assignee, reporter, ...rest } = updateTaskDto;

    const updateData: UpdateDataType = { ...rest };

    delete updateData['existingAttachments'];

    //FILE UPLOAD
    let uploadRes: Awaited<
      ReturnType<typeof this.storageService.uploadMultipleFiles>
    > | null = null;

    if (newFiles.length) {
      uploadRes = await this.storageService.uploadMultipleFiles(newFiles);
    }

    const newAttachments = uploadRes ?? [];
    const currentAttachments = task.attachments ?? [];

    let keptAttachments = currentAttachments;
    let deletedAttachments: typeof currentAttachments = [];

    if (updateTaskDto.existingAttachments) {
      keptAttachments = currentAttachments.filter((att) =>
        updateTaskDto.existingAttachments!.includes(att.key),
      );

      deletedAttachments = currentAttachments.filter(
        (att) => !updateTaskDto.existingAttachments!.includes(att.key),
      );
    }

    deletedAttachments.forEach((att) => {
      void this.storageService.deleteFile(att.key);
    });

    const attachments = [...keptAttachments, ...newAttachments];

    if (assignee !== undefined) {
      updateData.assignee = assignee ? new Types.ObjectId(assignee) : null;
    }

    if (reporter !== undefined) {
      updateData.reporter = new Types.ObjectId(reporter);
    }

    Object.keys(updateData).forEach((key) => {
      if (updateData[key as keyof UpdateDataType] === undefined) {
        delete updateData[key as keyof UpdateDataType];
      }
    });

    const taskPopulate = [
      { path: 'assignee', select: 'name email profileImage' },
      { path: 'reporter', select: 'name email profileImage' },
      { path: 'blocks', select: 'title key status type' },
      { path: 'blockedBy', select: 'title key status type' },
      { path: 'relatesTo', select: 'title key status type' },
      { path: 'duplicates', select: 'title key status type' },
    ];

    // BLOCKER VALIDATION
    const project = await this.projectModel.findById(task.projectId);
    const finalStatus = project?.columns.at(-1);

    let nextStatus = updateTaskDto.status ?? task.status;

    if (task.duplicates?.length) {
      const duplicateTasks = await this.taskModel.find({
        _id: { $in: task.duplicates },
      });

      const duplicateDone = duplicateTasks.some(
        (task) => task.status === finalStatus,
      );

      if (duplicateDone) {
        nextStatus = finalStatus as string;
      }
    }

    if (nextStatus === finalStatus && task.blockedBy?.length) {
      const blockingTasks = await this.taskModel.find({
        _id: { $in: task.blockedBy },
      });

      const unfinishedBlockers = blockingTasks.filter(
        (task) => task.status !== finalStatus,
      );

      if (unfinishedBlockers.length) {
        throw new BadRequestException(
          `Task cannot be marked "${finalStatus}" because it is blocked by unfinished tasks.`,
        );
      }
    }

    if (nextStatus !== task.status) {
      updateData.status = nextStatus;
    }

    const updatePayload = { ...updateData, attachments };

    const updatedTask = await this.taskModel
      .findByIdAndUpdate(id, updatePayload, {
        new: true,
        runValidators: true,
      })
      .populate(taskPopulate);

    if (!updatedTask) {
      throw new NotFoundException('Task not found after update');
    }

    if (updateData.status !== undefined && task.duplicates?.length) {
      const duplicates = await this.taskModel.find({
        _id: { $in: task.duplicates },
      });

      for (const dup of duplicates) {
        if (dup.blockedBy?.length) {
          const blockers = await this.taskModel.find({
            _id: { $in: dup.blockedBy },
          });

          const unfinished = blockers.filter(
            (blockTask) => blockTask.status !== finalStatus,
          );

          if (unfinished.length) {
            throw new BadRequestException(
              `Duplicate task "${dup.title}" cannot be marked "${finalStatus}" because it is blocked.`,
            );
          }
        }
      }

      await this.taskModel.updateMany(
        { _id: { $in: task.duplicates } },
        { status: updateData.status },
      );

      await updatedTask.populate({
        path: 'duplicates',
        select: 'title key status type',
      });
    }

    // ACTIVITY LOGS

    if (
      updateTaskDto.status !== undefined &&
      task.status !== updateTaskDto.status
    ) {
      await this.activityService.logStatusChange({
        taskId: task._id.toString(),
        byUserId: userId.toString(),
        oldStatus: task.status,
        newStatus: updateTaskDto.status,
      });
    }

    if (updateTaskDto.assignee !== undefined) {
      const oldAssigneeId = task.assignee?.toString() || null;
      const newAssigneeId = updateData.assignee?.toString() || null;

      if (oldAssigneeId !== newAssigneeId) {
        await this.activityService.logAssigneeChange({
          taskId: task._id.toString(),
          byUserId: userId.toString(),
          newAssigneeId,
        });
      }
    }

    const trackableFields = [
      ...TRACKABLE_TASK_FIELDS,
    ] as (keyof UpdateTaskDto)[];

    const changes: { field: string; oldValue: string; newValue: string }[] = [];

    for (const field of trackableFields) {
      if (updateTaskDto[field] !== undefined) {
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
        updateData.assignee,
        {
          title: `Task Assigned: "${task.title}"`,
          message: `You have been assigned to task "${task.title}"`,
          projectId: task.projectId,
          taskId: task._id,
        },
        {
          template: 'assignee',
          subject: 'Task Assigned',
          data: {
            taskKey: task.key,
            taskTitle: task.title,
            projectName: project?.name || '',
            actorName: actor?.name || 'Someone',
            taskUrl: this.buildTaskUrl(task._id.toString()),
          },
        },
      );
    }

    if (
      updateTaskDto.status !== undefined &&
      task.status !== updateTaskDto.status
    ) {
      const usersToNotify = new Set<string>();

      if (task.assignee && task.assignee.toString() !== userId.toString()) {
        usersToNotify.add(task.assignee.toString());
      }

      if (task.reporter.toString() !== userId.toString()) {
        usersToNotify.add(task.reporter.toString());
      }

      void Promise.all(
        Array.from(usersToNotify).map((notifyUserId) =>
          this.notifyUserWithPreferences(
            notifyUserId,
            {
              title: `Task Status Updated: "${task.title}"`,
              message: `Task "${task.title}" status changed from "${task.status}" to "${updateTaskDto.status}"`,
              projectId: task.projectId,
              taskId: task._id,
            },
            {
              template: 'task-status',
              subject: 'Task Status Updated',
              data: {
                taskKey: task.key,
                taskTitle: task.title,
                oldStatus: task.status,
                newStatus: updateTaskDto.status,
                projectName: project?.name || '',
                actorName: actor?.name || 'Someone',
                taskUrl: this.buildTaskUrl(task._id.toString()),
              },
            },
          ),
        ),
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

    const actor = await this.userModel.findById(userId);

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
            template: 'task-delete',
            subject: 'Task Deleted',
            data: {
              taskKey: task.key,
              taskTitle: task.title,
              projectName: project?.name || '',
              actorName: actor?.name || 'Someone',
            },
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
                  {
                    $gte: [
                      '$createdAt',
                      new Date(oneWeekAgo.setHours(0, 0, 0, 0)),
                    ],
                  },
                  {
                    $eq: [
                      { $ifNull: ['$updatedFields.status.to', null] },
                      '$$doneStatus',
                    ],
                  },
                ],
              },
            },
          },
          { $sort: { createdAt: -1 } },
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

  async startTimer(userId: ObjectIdLike, role: Role, taskId: string) {
    const task = await this.taskModel.findById(taskId);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.checkMembership(userId, role, task.projectId);

    const newWorklog = await this.worklogModel.create({
      taskId: task._id,
      userId: new mongoose.Types.ObjectId(userId.toString()),
      startTime: new Date(),
    });

    return newWorklog;
  }

  async stopTimer(userId: ObjectIdLike, role: Role, worklogId: string) {
    const worklog = await this.worklogModel.findById(worklogId);

    if (!worklog) {
      throw new NotFoundException('Worklog not found');
    }

    if (worklog.userId.toString() !== userId.toString()) {
      throw new UnauthorizedException('Task is not started by this user');
    }

    const task = await this.taskModel.findById(worklog.taskId);

    if (!task) {
      throw new NotFoundException('Associated task not found');
    }

    await this.checkMembership(userId, role, task.projectId);

    worklog.endTime = new Date();
    await worklog.save();

    return worklog;
  }

  async getWorklogsForTask(userId: ObjectIdLike, role: Role, taskId: string) {
    const task = await this.taskModel.findById(taskId);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.checkMembership(userId, role, task.projectId);

    const worklogs = await this.worklogModel
      .find({ taskId: task._id })
      .populate('userId', 'name email profileImage');

    return worklogs;
  }
}

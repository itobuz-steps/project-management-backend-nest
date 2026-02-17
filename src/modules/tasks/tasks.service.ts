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
import { ObjectIdLike } from 'src/type/common.type';
import {
  TaskFilters,
  TRACKABLE_TASK_FIELDS,
} from './interfaces/tasks.interface';
import { NotificationPushService } from '../notification/services/notification-push.service';
import { ActivityService } from '../activity/services/activity.service';
import { Role } from '../auth/types/auth.types';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<Task>,
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    private readonly activityService: ActivityService,
    private readonly notificationPushService: NotificationPushService,
  ) {}

  async create(userId: ObjectIdLike, role: Role, createTaskDto: CreateTaskDto) {
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

    const newTask = await this.taskModel.create({
      ...taskData,
      reporter: userId,
      key: `${project.prefix}-${project.lastKey + 1}`,
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
      this.notificationPushService
        .pushNotificationToUser(newTask.assignee, {
          title: `New Task Assigned: "${newTask.title}"`,
          message: `You have been assigned to task "${newTask.title}" in project "${project.name}"`,
          projectId: newTask.projectId,
          taskId: newTask._id,
        })
        .catch((err) => {
          console.error(
            'Error sending notification for new task assignment:',
            err,
          );
        });
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

    /**
     * Build safe update payload (DB shape, not DTO shape)
     */
    type UpdateDataType = Omit<UpdateTaskDto, 'assignee'> & {
      assignee?: Types.ObjectId | null;
    };

    const updateData: UpdateDataType = {
      ...updateTaskDto,
      assignee: updateTaskDto.assignee
        ? new Types.ObjectId(updateTaskDto.assignee)
        : null,
    };

    /**
     * Remove undefined fields
     */
    Object.keys(updateData).forEach((key) => {
      if (updateData[key as keyof UpdateDataType] === undefined) {
        delete updateData[key as keyof UpdateDataType];
      }
    });

    /**
     * Perform Update
     */
    const updatedTask = await this.taskModel
      .findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      })
      .populate('assignee', 'name email')
      .populate('reporter', 'name email');

    /**
     * Status Change Activity
     */
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

    // Track Other Field Changes

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

    if (changes) {
      await this.activityService.logTaskUpdated({
        taskId: task._id.toString(),
        byUserId: userId.toString(),
        changes,
      });
    }

    /**
     * Notify New Assignee
     */
    if (
      updateData.assignee &&
      task.assignee?.toString() !== updateData.assignee.toString() &&
      updateData.assignee.toString() !== userId.toString()
    ) {
      this.notificationPushService
        .pushNotificationToUser(updateTaskDto.assignee as ObjectIdLike, {
          title: `Task Assigned: "${task.title}"`,
          message: `You have been assigned to task "${task.title}"`,
          projectId: task.projectId,
          taskId: task._id,
        })
        .catch((err) => {
          console.error('Error sending notification for task assignment:', err);
        });
    }

    /**
     * Notify Status Change Users
     */
    if (updateTaskDto.status && task.status !== updateTaskDto.status) {
      const usersToNotify = new Set<string>();

      if (task.assignee && task.assignee.toString() !== userId.toString()) {
        usersToNotify.add(task.assignee.toString());
      }

      if (task.reporter.toString() !== userId.toString()) {
        usersToNotify.add(task.reporter.toString());
      }

      Promise.all(
        Array.from(usersToNotify).map((notifyUserId) =>
          this.notificationPushService.pushNotificationToUser(notifyUserId, {
            title: `Task Status Updated: "${task.title}"`,
            message: `Task "${task.title}" status changed from "${task.status}" to "${updateTaskDto.status}"`,
            projectId: task.projectId,
            taskId: task._id,
          }),
        ),
      ).catch((err) => {
        console.error(
          'Error sending notifications for task status update:',
          err,
        );
      });
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

    Promise.all(
      Array.from(usersToNotify).map((notifyUserId) =>
        this.notificationPushService.pushNotificationToUser(notifyUserId, {
          title: `Task Deleted: "${task.title}"`,
          message: `Task "${task.title}" has been deleted`,
          projectId: task.projectId,
        }),
      ),
    ).catch((err) => {
      console.error('Error sending notifications for task deletion:', err);
    });

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
}

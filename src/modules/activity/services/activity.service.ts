import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Activity } from '../schemas/activity.schemas';
import { ActivityAction } from '../type/activity.types';

@Injectable()
export class ActivityService {
  constructor(
    @InjectModel(Activity.name) private activityModel: Model<Activity>,
  ) {}

  // Log task creation
  async logTaskCreated(
    taskId: string,
    byUserId: string,
    taskTitle: string,
  ): Promise<Activity> {
    return this.activityModel.create({
      task: new Types.ObjectId(taskId),
      action: ActivityAction.TASK_CREATED,
      byUser: new Types.ObjectId(byUserId),
      updatedFields: {
        title: { from: '', to: taskTitle },
      },
    });
  }

  // Log a generic task update (any fields)
  async logTaskUpdated(
    taskId: string,
    byUserId: string,
    changes: { field: string; oldValue: string; newValue: string }[],
  ): Promise<Activity> {
    const updatedFields: Record<string, { from: string; to: string }> = {};
    for (const c of changes) {
      updatedFields[c.field] = { from: c.oldValue, to: c.newValue };
    }

    return this.activityModel.create({
      task: new Types.ObjectId(taskId),
      action: ActivityAction.TASK_UPDATED,
      byUser: new Types.ObjectId(byUserId),
      updatedFields,
    });
  }

  // Log a status change
  async logStatusChange(
    taskId: string,
    byUserId: string,
    oldStatus: string,
    newStatus: string,
  ): Promise<Activity> {
    return this.activityModel.create({
      task: new Types.ObjectId(taskId),
      action: ActivityAction.STATUS_CHANGED,
      byUser: new Types.ObjectId(byUserId),
      updatedFields: {
        status: { from: oldStatus, to: newStatus },
      },
    });
  }

  // Log a comment addition
  async logCommentAdded(
    taskId: string,
    byUserId: string,
    commentText: string,
  ): Promise<Activity> {
    return this.activityModel.create({
      task: new Types.ObjectId(taskId),
      action: ActivityAction.COMMENT_ADDED,
      byUser: new Types.ObjectId(byUserId),
      updatedFields: {
        comment: { from: '', to: commentText.substring(0, 200) },
      },
    });
  }

  // Log an assignee change
  async logAssigneeChange(
    taskId: string,
    byUserId: string,
    newAssigneeId: string,
    oldAssigneeId?: string,
  ): Promise<Activity> {
    return this.activityModel.create({
      task: new Types.ObjectId(taskId),
      action: ActivityAction.ASSIGNEE_CHANGED,
      byUser: new Types.ObjectId(byUserId),
      targetUser: new Types.ObjectId(newAssigneeId),
      updatedFields: {
        assignee: { from: oldAssigneeId ?? '', to: newAssigneeId },
      },
    });
  }

  // Get full timeline for a task
  async getTaskTimeline(
    taskId: string,
    page = 1,
    limit = 20,
  ): Promise<{ activities: Activity[]; total: number }> {
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      this.activityModel
        .find({ task: new Types.ObjectId(taskId) })
        .populate('byUser', 'name email avatar')
        .populate('targetUser', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.activityModel.countDocuments({ task: new Types.ObjectId(taskId) }),
    ]);

    return { activities, total };
  }

  // Get timeline filtered by action type
  async getTaskTimelineByAction(
    taskId: string,
    action: ActivityAction,
  ): Promise<Activity[]> {
    return this.activityModel
      .find({
        task: new Types.ObjectId(taskId),
        action,
      })
      .populate('byUser', 'name email avatar')
      .populate('targetUser', 'name email avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  // Get all activities across all tasks
  async getAllActivities(
    page = 1,
    limit = 20,
    filters: { action?: ActivityAction; projectId?: string } = {},
  ): Promise<{ activities: Activity[]; total: number }> {
    const skip = (page - 1) * limit;
    const query: Record<string, any> = {};

    if (filters.action) {
      query.action = filters.action;
    }

    const [activities, total] = await Promise.all([
      this.activityModel
        .find(query)
        .populate('task', 'title key status projectId')
        .populate('byUser', 'name email avatar')
        .populate('targetUser', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.activityModel.countDocuments(query),
    ]);

    return { activities, total };
  }
}

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Activity } from '../schemas/activity.schemas';
import { ActivityAction } from '../type/activity.types';
import {
  LogTaskCreatedParams,
  LogTaskUpdatedParams,
  LogStatusChangeParams,
  LogCommentAddedParams,
  LogAssigneeChangeParams,
} from '../type/activity-params.types';

@Injectable()
export class ActivityService {
  constructor(
    @InjectModel(Activity.name) private activityModel: Model<Activity>,
  ) {}

  async logTaskCreated(params: LogTaskCreatedParams): Promise<Activity> {
    const { taskId, byUserId, taskTitle } = params;
    return this.activityModel.create({
      task: new Types.ObjectId(taskId),
      action: ActivityAction.TASK_CREATED,
      byUser: new Types.ObjectId(byUserId),
      updatedFields: {
        title: { from: '', to: taskTitle },
      },
    });
  }

  async logTaskUpdated(params: LogTaskUpdatedParams): Promise<Activity> {
    const { taskId, byUserId, changes } = params;
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

  async logStatusChange(params: LogStatusChangeParams): Promise<Activity> {
    const { taskId, byUserId, oldStatus, newStatus } = params;
    return this.activityModel.create({
      task: new Types.ObjectId(taskId),
      action: ActivityAction.STATUS_CHANGED,
      byUser: new Types.ObjectId(byUserId),
      updatedFields: {
        status: { from: oldStatus, to: newStatus },
      },
    });
  }

  async logCommentAdded(params: LogCommentAddedParams): Promise<Activity> {
    const { taskId, byUserId, commentText } = params;
    return this.activityModel.create({
      task: new Types.ObjectId(taskId),
      action: ActivityAction.COMMENT_ADDED,
      byUser: new Types.ObjectId(byUserId),
      updatedFields: {
        comment: { from: '', to: commentText.substring(0, 200) },
      },
    });
  }

  async logAssigneeChange(params: LogAssigneeChangeParams): Promise<Activity> {
    const { taskId, byUserId, newAssigneeId, oldAssigneeId } = params;
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

  async getAllActivities(
    page = 1,
    limit = 20,
    filters: { action?: ActivityAction; projectId?: string } = {},
  ): Promise<{ activities: Activity[]; total: number }> {
    const skip = (page - 1) * limit;
    const query: Record<string, string> = {};

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

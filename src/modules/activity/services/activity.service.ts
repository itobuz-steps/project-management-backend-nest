import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, PipelineStage, QueryFilter } from 'mongoose';
import { Activity } from '../schemas/activity.schemas';
import { ActivityAction } from '../type/activity.types';
import {
  LogTaskCreatedParams,
  LogTaskUpdatedParams,
  LogStatusChangeParams,
  LogCommentAddedParams,
  LogAssigneeChangeParams,
  LogRemovedFromSprintParams,
} from '../type/activity-params.types';
import { User, UserDocument } from 'src/modules/auth/schemas/user.schema';
import { GetActivitiesDto } from '../dto/get-activities.dto';
import {
  ActivityFilter,
  AggregatedActivity,
  CountResult,
  PaginatedActivitiesResult,
} from '../type/activity-filter.type';

@Injectable()
export class ActivityService {
  constructor(
    @InjectModel(Activity.name) private activityModel: Model<Activity>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  private normalizeUpdatedValue(field: string, value: string): string {
    if (field !== 'dueDate' || !value) {
      return value;
    }

    const parsedDate = new Date(value);

    return parsedDate.toDateString();
  }

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
      updatedFields[c.field] = {
        from: this.normalizeUpdatedValue(c.field, c.oldValue),
        to: this.normalizeUpdatedValue(c.field, c.newValue),
      };
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
    const { taskId, byUserId, newAssigneeId } = params;

    // Create activity data with or without targetUser
    if (newAssigneeId) {
      return this.activityModel.create({
        task: new Types.ObjectId(taskId),
        action: ActivityAction.ASSIGNEE_CHANGED,
        byUser: new Types.ObjectId(byUserId),
        targetUser: new Types.ObjectId(newAssigneeId),
        updatedFields: {
          assignee: {
            to: (await this.userModel.findById(newAssigneeId).select('name'))!
              .name,
          },
        },
      });
    } else {
      return this.activityModel.create({
        task: new Types.ObjectId(taskId),
        action: ActivityAction.ASSIGNEE_CHANGED,
        byUser: new Types.ObjectId(byUserId),
        updatedFields: {
          assignee: { to: '' },
        },
      });
    }
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

  async logRemovedFromSprint(
    params: LogRemovedFromSprintParams,
  ): Promise<Activity> {
    const { taskId, byUserId, sprintId } = params;
    const updatedFields: Record<string, { from: string; to: string }> = {};

    updatedFields.sprint = { from: sprintId?.toString() ?? '', to: '' };

    return this.activityModel.create({
      task: new Types.ObjectId(taskId),
      action: ActivityAction.REMOVED_FROM_SPRINT,
      byUser: new Types.ObjectId(byUserId),
      updatedFields,
    });
  }

  async logProjectCreated(
    projectId: string,
    byUserId: string,
    projectName: string,
  ) {
    return this.activityModel.create({
      project: new Types.ObjectId(projectId),
      projectName: projectName,
      action: ActivityAction.PROJECT_CREATED,
      byUser: new Types.ObjectId(byUserId),
    });
  }

  async logProjectDelete(projectId: string, byUserId: string) {
    return this.activityModel.create({
      project: new Types.ObjectId(projectId),
      action: ActivityAction.PROJECT_DELETED,
      byUser: new Types.ObjectId(byUserId),
    });
  }

  async logDeleteProjectColumn(
    projectId: string,
    byUserId: string,
    columnName: string,
  ) {
    return this.activityModel.create({
      project: new Types.ObjectId(projectId),
      byUser: new Types.ObjectId(byUserId),
      action: ActivityAction.COLUMN_DELETED,
      updatedFields: {
        column: { from: columnName, to: '' },
      },
    });
  }

  private async resolveFieldValue(key: string, value: string): Promise<string> {
    if (!value) return '';

    if (key === 'defaultAssignee') {
      if (!Types.ObjectId.isValid(value)) return value;
      const user = await this.userModel.findById(value).select('name');
      return user?.name || value;
    }

    return value;
  }

  async logUpdateProject(
    projectId: string,
    byUserId: string,
    updates: Record<string, { from: string; to: string }>,
  ) {
    const transformedUpdates: Record<string, { from: string; to: string }> = {};

    for (const key of Object.keys(updates)) {
      transformedUpdates[key] = {
        from: await this.resolveFieldValue(key, updates[key].from),
        to: await this.resolveFieldValue(key, updates[key].to),
      };
    }

    return this.activityModel.create({
      project: new Types.ObjectId(projectId),
      byUser: new Types.ObjectId(byUserId),
      action: ActivityAction.PROJECT_UPDATED,
      updatedFields: transformedUpdates,
    });
  }

  async logMemberChange(
    projectId: string,
    byUserId: string,
    action: ActivityAction,
    memberId: string,
  ) {
    const user = await this.userModel.findById(memberId).select('name');
    return this.activityModel.create({
      project: new Types.ObjectId(projectId),
      byUser: new Types.ObjectId(byUserId),
      action,
      updatedFields: {
        member: {
          from: '',
          to: user?.name,
        },
      },
    });
  }

  async logMemberRoleChanged(
    projectId: string,
    byUserId: string,
    memberId: string,
    fromRole: string,
    toRole: string,
  ) {
    const user = await this.userModel.findById(memberId).select('name');
    return this.activityModel.create({
      project: new Types.ObjectId(projectId),
      byUser: new Types.ObjectId(byUserId),
      action: ActivityAction.ROLE_CHANGED,
      updatedFields: {
        member: {
          from: `${user?.name ?? memberId} (${fromRole})`,
          to: `${user?.name ?? memberId} (${toRole})`,
        },
      },
    });
  }

  async getProjectActivities(
    projectId: string,
    options: GetActivitiesDto,
  ): Promise<PaginatedActivitiesResult> {
    const {
      page = 1,
      limit = 10,
      search,
      byUsers,
      actions,
      dateFrom,
      dateTo,
    } = options;

    const skip = (page - 1) * limit;

    const filter: QueryFilter<Activity> = {
      project: new Types.ObjectId(projectId),
    };

    if (actions?.length) {
      filter.action = { $in: actions };
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {
        ...(dateFrom ? { $gte: new Date(dateFrom) } : {}),
        ...(dateTo
          ? {
              $lte: (() => {
                const end = new Date(dateTo);
                end.setHours(23, 59, 59, 999);
                return end;
              })(),
            }
          : {}),
      };
    }

    const matchConditions: QueryFilter<AggregatedActivity> = {};

    if (byUsers?.length) {
      const validUserIds = byUsers
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id));

      if (validUserIds.length) {
        matchConditions['byUser._id'] = { $in: validUserIds };
      }
    }

    if (search?.trim()) {
      const regex = new RegExp(search.trim(), 'i');

      matchConditions.$or = [
        { 'byUser.name': regex },
        { projectName: regex },
        { action: regex },
      ];
    }

    const pipeline: PipelineStage[] = [
      { $match: filter },
      {
        $lookup: {
          from: 'users',
          localField: 'byUser',
          foreignField: '_id',
          as: 'byUser',
        },
      },
      {
        $unwind: {
          path: '$byUser',
          preserveNullAndEmptyArrays: false,
        },
      },
    ];

    if (Object.keys(matchConditions).length) {
      pipeline.push({ $match: matchConditions });
    }

    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          action: 1,
          projectName: 1,
          updatedFields: 1,
          createdAt: 1,
          'byUser._id': 1,
          'byUser.name': 1,
          'byUser.profileImage': 1,
        },
      },
    );

    const countPipeline: PipelineStage[] = [
      { $match: filter },
      {
        $lookup: {
          from: 'users',
          localField: 'byUser',
          foreignField: '_id',
          as: 'byUser',
        },
      },
      { $unwind: '$byUser' },
    ];

    if (Object.keys(matchConditions).length) {
      countPipeline.push({ $match: matchConditions });
    }

    countPipeline.push({ $count: 'total' });

    const [activities, countResult] = await Promise.all([
      this.activityModel.aggregate<AggregatedActivity>(pipeline),
      this.activityModel.aggregate<CountResult>(countPipeline),
    ]);

    const total = countResult[0]?.total ?? 0;

    return {
      activities,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async exportProjectActivities(
    projectId: string,
    options: GetActivitiesDto,
  ): Promise<{ activities: AggregatedActivity[] }> {
    const { search, byUsers, actions, dateFrom, dateTo } = options;

    const filter: ActivityFilter = {
      project: new Types.ObjectId(projectId),
    };

    if (actions?.length) filter.action = { $in: actions };

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (search || byUsers?.length) {
      const pipeline: PipelineStage[] = [
        { $match: filter },
        {
          $lookup: {
            from: 'users',
            localField: 'byUser',
            foreignField: '_id',
            as: 'byUser',
          },
        },
        { $unwind: '$byUser' },
      ];

      const andConditions: Record<string, unknown>[] = [];

      if (byUsers?.length) {
        andConditions.push({
          'byUser._id': { $in: byUsers.map((id) => new Types.ObjectId(id)) },
        });
      }

      if (search) {
        const regex = new RegExp(search, 'i');
        andConditions.push({
          $or: [
            { 'byUser.name': regex },
            { projectName: regex },
            { action: regex },
          ],
        });
      }

      if (andConditions.length)
        pipeline.push({ $match: { $and: andConditions } });

      pipeline.push(
        { $sort: { createdAt: -1 } },
        {
          $project: {
            action: 1,
            projectName: 1,
            updatedFields: 1,
            createdAt: 1,
            'byUser._id': 1,
            'byUser.name': 1,
            'byUser.profileImage': 1,
          },
        },
      );

      const activities =
        await this.activityModel.aggregate<AggregatedActivity>(pipeline);
      return { activities };
    }

    const docs = await this.activityModel
      .find(filter)
      .populate<{
        byUser: { _id: Types.ObjectId; name: string; profileImage: string };
      }>('byUser', 'name profileImage')
      .sort({ createdAt: -1 });

    const activities: AggregatedActivity[] = docs.map((doc) => {
      const plain = doc.toObject() as unknown as Activity & {
        byUser: { _id: Types.ObjectId; name: string; profileImage: string };
        createdAt: Date;
      };
      return {
        _id: plain._id,
        action: plain.action!,
        projectName: plain.projectName,
        updatedFields: plain.updatedFields,
        createdAt: plain.createdAt,
        byUser: {
          _id: plain.byUser._id,
          name: plain.byUser.name,
          profileImage: plain.byUser.profileImage,
        },
      } as AggregatedActivity;
    });

    return { activities };
  }
}

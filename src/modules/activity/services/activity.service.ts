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
  AggregatedActivity,
  CountResult,
  PaginatedActivitiesResult,
} from '../type/activity-filter.type';
import { Task } from 'src/modules/tasks/entities/task.entity';

interface BuildPipelineOptions {
  projectId: string;
  search?: string;
  byUsers?: string[];
  actions?: string[];
  dateFrom?: string;
  dateTo?: string;
}

interface BuiltPipeline {
  pipeline: PipelineStage[];
  countPipeline: PipelineStage[];
}

interface SubtaskStatResult {
  _id: {
    epicId: Types.ObjectId;
    status: string;
  };
  count: number;
}
interface EpicDocument {
  _id: Types.ObjectId;
  title: string;
  key: string;
  status: string;
}

@Injectable()
export class ActivityService {
  constructor(
    @InjectModel(Activity.name)
    private activityModel: Model<Activity>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(Task.name)
    private readonly taskModel: Model<Task>,
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

  private buildActivityPipeline(options: BuildPipelineOptions): BuiltPipeline {
    const { projectId, search, byUsers, actions, dateFrom, dateTo } = options;

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

    const basePipeline: PipelineStage[] = [
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
      ...(Object.keys(matchConditions).length
        ? [{ $match: matchConditions } as PipelineStage]
        : []),
    ];

    const $projectStage: PipelineStage = {
      $project: {
        action: 1,
        projectName: 1,
        updatedFields: 1,
        createdAt: 1,
        'byUser._id': 1,
        'byUser.name': 1,
        'byUser.profileImage': 1,
      },
    };

    const pipeline: PipelineStage[] = [
      ...basePipeline,
      { $sort: { createdAt: -1 } },
      $projectStage,
    ];

    const countPipeline: PipelineStage[] = [
      ...basePipeline,
      { $count: 'total' },
    ];

    return { pipeline, countPipeline };
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

    const { pipeline, countPipeline } = this.buildActivityPipeline({
      projectId,
      search,
      byUsers,
      actions,
      dateFrom,
      dateTo,
    });

    // Inject skip/limit before $project (last stage)
    const paginatedPipeline: PipelineStage[] = [
      ...pipeline.slice(0, -1), // everything except $project
      { $skip: skip },
      { $limit: limit },
      pipeline[pipeline.length - 1], // $project last
    ];

    const [activities, countResult] = await Promise.all([
      this.activityModel.aggregate<AggregatedActivity>(paginatedPipeline),
      this.activityModel.aggregate<CountResult>(countPipeline),
    ]);

    const total = countResult[0]?.total ?? 0;

    return { activities, total, page, totalPages: Math.ceil(total / limit) };
  }

  async exportProjectActivities(
    projectId: string,
    options: GetActivitiesDto,
  ): Promise<{ activities: AggregatedActivity[] }> {
    const { search, byUsers, actions, dateFrom, dateTo } = options;

    const { pipeline } = this.buildActivityPipeline({
      projectId,
      search,
      byUsers,
      actions,
      dateFrom,
      dateTo,
    });

    const activities =
      await this.activityModel.aggregate<AggregatedActivity>(pipeline);

    return { activities };
  }

  async getProjectAnalytics(projectId: string) {
    const id = new Types.ObjectId(projectId);

    const [
      statusOverview,
      priorityBreakdown,
      typesOfWork,
      teamWorkload,
      epicProgress,
      recentActivity,
    ] = await Promise.all([
      this.getStatusOverview(id),
      this.getPriorityBreakdown(id),
      this.getTypesOfWork(id),
      this.getTeamWorkload(id),
      this.getEpicProgress(id),
      this.getRecentActivity(id),
    ]);

    return {
      statusOverview,
      priorityBreakdown,
      typesOfWork,
      teamWorkload,
      epicProgress,
      recentActivity,
    };
  }

  private async getStatusOverview(projectId: Types.ObjectId) {
    return this.taskModel.aggregate([
      { $match: { projectId, parentTask: null } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } },
    ]);
  }

  private async getPriorityBreakdown(projectId: Types.ObjectId) {
    return this.taskModel.aggregate([
      { $match: { projectId, parentTask: null } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $project: { priority: '$_id', count: 1, _id: 0 } },
      {
        $sort: {
          priority: 1,
        },
      },
    ]);
  }

  private async getTypesOfWork(projectId: Types.ObjectId) {
    return this.taskModel.aggregate([
      { $match: { projectId, parentTask: null } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $project: { type: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } },
    ]);
  }

  private async getTeamWorkload(projectId: Types.ObjectId) {
    return this.taskModel.aggregate([
      {
        $match: {
          projectId,
          parentTask: null,
          assignee: { $ne: null },
          status: { $ne: 'done' },
        },
      },
      { $group: { _id: '$assignee', count: { $sum: 1 } } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          userId: '$user._id',
          name: '$user.name',
          profileImage: '$user.profileImage',
          count: 1,
        },
      },
      { $sort: { count: -1 } },
    ]);
  }

  private async getEpicProgress(projectId: Types.ObjectId) {
    const epics = await this.taskModel
      .find({ projectId, type: 'epic' })
      .select('_id title key status')
      .lean<EpicDocument[]>();

    const epicIds = epics.map((e) => e._id);

    const subtaskStats = await this.taskModel.aggregate<SubtaskStatResult>([
      {
        $match: {
          projectId,
          parentTask: { $in: epicIds },
        },
      },
      {
        $group: {
          _id: { epicId: '$parentTask', status: '$status' },
          count: { $sum: 1 },
        },
      },
    ]);

    return epics.map((epic) => {
      const stats = subtaskStats.filter(
        (s) => s._id.epicId.toString() === epic._id.toString(),
      );

      const statusMap: Record<string, number> = {};
      let total = 0;
      let completed = 0;

      for (const s of stats) {
        statusMap[s._id.status] = s.count;
        total += s.count;
        if (s._id.status === 'done') {
          completed += s.count;
        }
      }

      return {
        epicId: epic._id,
        title: epic.title,
        key: epic.key,
        epicStatus: epic.status,
        total,
        completed,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        breakdown: statusMap,
      };
    });
  }

  private async getRecentActivity(projectId: Types.ObjectId) {
    return this.activityModel.aggregate([
      { $match: { project: projectId } },
      { $sort: { createdAt: -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: 'users',
          localField: 'byUser',
          foreignField: '_id',
          as: 'byUser',
        },
      },
      { $unwind: '$byUser' },
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
    ]);
  }
}

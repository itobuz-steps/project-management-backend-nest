import { ObjectIdLike } from 'src/type/common.type';
import { Task } from '../entities/task.entity';

export interface TaskPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export const TRACKABLE_TASK_FIELDS = [
  'title',
  'description',
  'priority',
  'type',
  'tags',
  'dueDate',
  'storyPoint',
] as const;

export interface TaskStats {
  totalAssignedTasks: number;
  tasksCompletedThisWeek: number;
  storyPointsCompletedThisWeek: number;
  tasksCompletedEachDay: {
    date: string;
    count: number;
  }[];
  allTasksGroupedByProject: Record<string, Task[]>;
  completedTasksGroupedByProject: Record<string, Task[]>;
}

export interface ProjectNotificationPayload {
  title: string;
  message: string;
  projectId: ObjectIdLike;
  taskId?: ObjectIdLike;
}

export interface UserEmailPayload {
  projectName?: string;
  highlightText?: string;
}

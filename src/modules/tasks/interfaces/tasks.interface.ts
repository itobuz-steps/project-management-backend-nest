import { TaskPriority } from 'src/constants/task.constants';
import { ObjectIdLike } from 'src/type/common.type';
import { Task } from '../entities/task.entity';

export interface TaskFilters {
  projectId?: ObjectIdLike;
  searchQuery?: string;
  sortBy?: keyof Task | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  priority?: TaskPriority;
  status?: string;
  tags?: string[] | string;
  assignee?: ObjectIdLike;
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

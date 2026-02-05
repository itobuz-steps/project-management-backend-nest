export const TASK_TYPES = ['bug', 'task', 'story'];
export const TASK_PRIORITIES = ['low', 'medium', 'high', 'critical'];

export type TaskType = (typeof TASK_TYPES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

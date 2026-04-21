import { CreateTaskDto } from '../dto/create-task.dto';

export const CSV_ARRAY_FIELDS = new Set<keyof CreateTaskDto>([
  'tags',
  'subTasks',
  'blocks',
  'blockedBy',
  'relatesTo',
  'duplicates',
]);

export const CSV_IMPORT_FIELD_MAP: Record<
  string,
  keyof CreateTaskDto | 'projectId'
> = {
  projectid: 'projectId',
  title: 'title',
  description: 'description',
  type: 'type',
  status: 'status',
  priority: 'priority',
  tags: 'tags',
  duedate: 'dueDate',
  assignee: 'assignee',
  storypoint: 'storyPoint',
  subtasks: 'subTasks',
  parenttask: 'parentTask',
  blocks: 'blocks',
  blockedby: 'blockedBy',
  relatesto: 'relatesTo',
  duplicates: 'duplicates',
};

export const IMPORT_DEFAULT_FIELDS: Array<keyof CreateTaskDto | 'attachments'> =
  [
    'description',
    'priority',
    'tags',
    'dueDate',
    'assignee',
    'storyPoint',
    'subTasks',
    'parentTask',
    'blocks',
    'blockedBy',
    'relatesTo',
    'duplicates',
    'attachments',
  ];

export const CSV_NULLISH_VALUES = new Set([
  '',
  'null',
  'undefined',
  'none',
  'nil',
  'n/a',
  '-',
  'unassigned',
]);

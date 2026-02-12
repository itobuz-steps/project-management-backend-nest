export interface LogTaskCreatedParams {
  taskId: string;
  byUserId: string;
  taskTitle: string;
}

export interface LogTaskUpdatedParams {
  taskId: string;
  byUserId: string;
  changes: { field: string; oldValue: string; newValue: string }[];
}

export interface LogStatusChangeParams {
  taskId: string;
  byUserId: string;
  oldStatus: string;
  newStatus: string;
}

export interface LogCommentAddedParams {
  taskId: string;
  byUserId: string;
  commentText: string;
}

export interface LogAssigneeChangeParams {
  taskId: string;
  byUserId: string;
  newAssigneeId: string;
  oldAssigneeId?: string;
}

import { ObjectIdLike } from 'src/type/common.type';
import { Role } from '../../auth/types/auth.types';

export interface ProjectAccessParams {
  userId: ObjectIdLike;
  projectId: ObjectIdLike;
  role: Role;
}

export interface SprintAccessParams {
  userId: ObjectIdLike;
  sprintId: ObjectIdLike;
  role: Role;
}

export interface SprintIdParams extends ProjectAccessParams {
  sprintId: ObjectIdLike;
}

export interface ProjectNotificationPayload {
  title: string;
  message: string;
  projectId: ObjectIdLike;
  taskId?: ObjectIdLike;
}

export interface ProjectEmailPayload {
  subject: string;
  title: string;
  highlightText?: string;
}

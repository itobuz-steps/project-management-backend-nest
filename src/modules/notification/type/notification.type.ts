import { ObjectIdLike } from 'src/type/common.type';

export interface WebPushPayload {
  title: string;
  message?: string;
  projectId?: string;
  taskId?: string;
  profileImage?: string | null;
  createdAt?: Date;
}

export interface PushNotificationPayload {
  title: string;
  message?: string;
  projectId?: ObjectIdLike;
  taskId?: ObjectIdLike;
  profileImage?: string | null;
}

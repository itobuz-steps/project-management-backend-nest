import { Types } from 'mongoose';
export enum ProjectType {
  KANBAN = 'kanban',
  SCRUM = 'scrum',
}

export enum ProjectRole {
  MEMBER = 'member',
  ADMIN = 'admin',
}

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
  };
}

export type ObjectIdLike = string | Types.ObjectId | undefined;

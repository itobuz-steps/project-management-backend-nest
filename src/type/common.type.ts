import { Types } from 'mongoose';
export type ObjectIdLike = string | Types.ObjectId | undefined;

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
  };
}

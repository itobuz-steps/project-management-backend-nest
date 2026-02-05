import { Types, HydratedDocument } from 'mongoose';
import { User } from 'src/modules/auth/schemas/user.schema';

export type ObjectIdLike = string | Types.ObjectId;

export interface AuthenticatedRequest extends Request {
  user: HydratedDocument<User>;
}

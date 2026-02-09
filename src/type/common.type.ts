import type { Request } from 'express';
import { Types, HydratedDocument } from 'mongoose';
import { User } from 'src/modules/auth/schemas/user.schema';
import { Project } from 'src/modules/project/schema/project.schema';
import { ProjectRole } from 'src/modules/project/type/project.types';

export type ObjectIdLike = string | Types.ObjectId;

export interface AuthenticatedRequest extends Request {
  user: HydratedDocument<User>;
  userRole?: ProjectRole;
  project?: Project;
}

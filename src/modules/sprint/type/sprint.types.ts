import { ObjectIdLike } from 'src/type/common.type';
import { Role } from '../../auth/types/auth.types';
import { Types } from 'mongoose';

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

export interface StatusActivity {
  _id: Types.ObjectId;
  doc: {
    updatedFields?: {
      status?: {
        to?: string;
      };
    };
  };
}

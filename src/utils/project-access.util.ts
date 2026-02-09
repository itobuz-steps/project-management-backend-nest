import { Model } from 'mongoose';
import { Role } from 'src/modules/auth/types/auth.types';
import { Project } from 'src/modules/project/schema/project.schema';
import { ObjectIdLike } from 'src/type/common.type';

export async function getProjectWithAccess(
  projectModel: Model<Project>,
  projectId: ObjectIdLike,
  userId: ObjectIdLike,
  role: Role,
): Promise<Project | null> {
  if (role === Role.SUPERADMIN) {
    return projectModel.findById(projectId);
  }

  return projectModel.findOne({
    _id: projectId,
    'members.user': userId,
  });
}

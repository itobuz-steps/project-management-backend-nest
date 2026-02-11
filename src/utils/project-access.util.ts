import { Model } from 'mongoose';
import { Role } from 'src/modules/auth/types/auth.types';
import { Project } from 'src/modules/project/schema/project.schema';
import { ProjectAccessParams } from 'src/modules/sprint/type/sprint.types';

export async function getProjectWithAccess(
  projectModel: Model<Project>,
  params: ProjectAccessParams,
): Promise<Project | null> {
  const { projectId, userId, role } = params;

  if (role === Role.SUPERADMIN) {
    return projectModel.findById(projectId);
  }

  return projectModel.findOne({
    _id: projectId,
    'members.user': userId,
  });
}

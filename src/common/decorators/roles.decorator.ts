import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../guards/roles.guard';
import { ProjectRole } from 'src/modules/project/type/project.types';

export const ROLES_KEY = 'project_roles';

export const Roles = (...roles: ProjectRole[]) => {
  return applyDecorators(SetMetadata(ROLES_KEY, roles), UseGuards(RolesGuard));
};

import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../guards/roles.guard';
import { Role } from 'src/modules/auth/types/auth.types';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: Role[]) => {
  return applyDecorators(SetMetadata(ROLES_KEY, roles), UseGuards(RolesGuard));
};

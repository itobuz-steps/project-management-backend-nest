import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Types } from 'mongoose';
import type { ProjectService } from 'src/modules/project/project.service';
import { ProjectRole } from 'src/modules/project/type/project.types';
import { AuthenticatedRequest } from 'src/type/common.type';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from 'src/modules/auth/types/auth.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    @Inject('ProjectService') private readonly projectService: ProjectService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<ProjectRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.user.role == Role.SUPERADMIN) {
      return true;
    }

    const projectId = request?.params?.projectId as string;

    if (!projectId) {
      throw new ForbiddenException(
        'Project ID is required in the route parameters',
      );
    }

    if (!request.user) {
      throw new ForbiddenException('User not authenticated');
    }

    const project = await this.projectService.getProjectById(
      request.user._id,
      projectId,
    );

    const member = project.members.find(
      (m: { user: Types.ObjectId; role: ProjectRole }) =>
        m.user.toString() === request?.user?._id.toString(),
    );

    if (!member) {
      throw new ForbiddenException('Not a project member');
    }

    if (requiredRoles) {
      const hasRole = requiredRoles.includes(member.role);

      if (!hasRole) {
        throw new ForbiddenException(
          `Insufficient permissions. Required roles: ${requiredRoles.join(', ')}`,
        );
      }
    }

    request.userRole = member.role;
    request.project = project;
    return true;
  }
}

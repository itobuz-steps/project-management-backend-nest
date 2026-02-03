import { Controller, Get, Param, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ProjectService } from './project.service';
import type { AuthenticatedRequest } from './type/project.types';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  async getAllProjects(@Req() req: AuthenticatedRequest) {
    // const userId = req.user._id;
    const userId = process.env.MY_USER;

    return this.projectService.getAllProjects(userId);
  }

  @Get(':id')
  async getProjectById(
    @Req() req: AuthenticatedRequest,
    @Param('id') projectId: string,
    // @Headers('x-user-id') userId: string,
  ) {
    // const userId = req.user._id;
    const userId = process.env.MY_USER;
    return {
      success: true,
      result: await this.projectService.getProjectById(userId, projectId),
    };
  }
}

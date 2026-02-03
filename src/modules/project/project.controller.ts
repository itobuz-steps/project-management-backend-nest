import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ProjectService } from './project.service';

interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
  };
}

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  async getAllProjects(@Req() req: AuthenticatedRequest) {
    // const userId = req.user._id;
    const userId = process.env.MY_USER;

    return this.projectService.getAllProjects(userId);
  }
}

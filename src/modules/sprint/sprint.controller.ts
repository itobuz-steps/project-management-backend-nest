import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { SprintService } from './sprint.service';
import type { AuthenticatedRequest } from 'src/type/common.type';

@Controller('sprint')
export class SprintController {
  constructor(private readonly sprintService: SprintService) {}

  // GET /sprint?projectId=xxx
  @Get()
  async getAllSprints(
    @Req() req: AuthenticatedRequest,
    @Query('projectId') projectId?: string,
  ) {
    // const userId = req.user._id;
    const userId = process.env.MY_USER;

    const result = projectId
      ? await this.sprintService.getSprintsByProjectId(userId, projectId)
      : await this.sprintService.getAllSprints();

    return {
      success: true,
      result,
    };
  }

  // GET /sprint/:id
  @Get(':id')
  async getSprintById(
    @Req() req: AuthenticatedRequest,
    @Param('id') sprintId: string,
  ) {
    // const userId = req.user._id;
    const userId = process.env.MY_USER;

    const sprint = await this.sprintService.getSprintById(userId, sprintId);

    return {
      success: true,
      result: sprint,
    };
  }
}

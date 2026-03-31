import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ActivityService } from './services/activity.service';
import { ActivityAction } from './type/activity.types';
import { IsAuthenticated } from 'src/middlewares/isAuthenticated';
import { GetActivitiesDto } from './dto/get-activities.dto';
import { PaginatedActivitiesResult } from './type/activity-filter.type';

@Controller()
@UseGuards(IsAuthenticated)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  // GET /activities — all activities across all tasks
  @Get('activities')
  async getAllActivities(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('action') action?: ActivityAction,
  ) {
    return this.activityService.getAllActivities(+page, +limit, { action });
  }

  // GET /tasks/:taskId/activities — activities for a specific task
  @Get('tasks/:taskId/activities')
  async getTaskTimeline(
    @Param('taskId') taskId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('action') action?: ActivityAction,
  ) {
    if (action) {
      const activities = await this.activityService.getTaskTimelineByAction(
        taskId,
        action,
      );
      return { activities, total: activities.length };
    }
    return this.activityService.getTaskTimeline(taskId, +page, +limit);
  }

  @Post('projects/:projectId/activities')
  async getProjectActivities(
    @Param('projectId') projectId: string,
    @Body() body: GetActivitiesDto,
  ): Promise<PaginatedActivitiesResult> {
    return await this.activityService.getProjectActivities(projectId, body);
  }

  // controller
  @Post('projects/:projectId/activities/export')
  async exportProjectActivities(
    @Param('projectId') projectId: string,
    @Body() body: GetActivitiesDto,
  ) {
    console.log(body);
    return await this.activityService.exportProjectActivities(projectId, body);
  }
}

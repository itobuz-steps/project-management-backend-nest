import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ActivityService } from './services/activity.service';
import { ActivityAction } from './type/activity.types';
import { IsAuthenticated } from 'src/middlewares/isAuthenticated';

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

  @Get('projects/:projectId/activities')
  async getProjectActivities(
    @Param('projectId') projectId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return await this.activityService.getProjectActivities(
      projectId,
      +page,
      +limit,
    );
  }
}

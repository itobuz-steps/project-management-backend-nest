import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ActivityService } from './services/activity.service';
import { ActivityAction } from './type/activity.types';
import { IsAuthenticated } from 'src/middlewares/isAuthenticated';

@Controller('activities')
@UseGuards(IsAuthenticated)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  // GET /activities — all activities across all tasks
  @Get()
  async getAllActivities(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('action') action?: ActivityAction,
  ) {
    return this.activityService.getAllActivities(+page, +limit, { action });
  }

  // GET /activities/task/:taskId — activities for a specific task
  @Get('task/:taskId')
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
}

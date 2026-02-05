import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { IsAuthenticated } from '../../middlewares/isAuthenticated';
import { Request } from 'express';
import type { AuthenticatedRequest } from 'src/type/common.type';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { PaginationDto } from './dto/pagination.dto';

@Controller('notification')
@UseGuards(IsAuthenticated)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('subscribe')
  async subscribe(@Body() dto: CreateSubscriptionDto) {
    await this.notificationService.saveSubscription(dto);

    return { success: true };
  }

  @Get('get')
  async getAllNotifications(
    @Req() req: AuthenticatedRequest,
    @Query() query: PaginationDto,
  ) {
    const page = Number(query.page ?? 0);
    const limit = Number(query.limit ?? 10);

    const result = await this.notificationService.getAllNotificationsByProject(
      req.user._id,
      Number(page),
      Number(limit),
    );

    return {
      success: true,
      result: result.notifications,
      pagination: result.pagination,
    };
  }

  @Delete(':notificationId')
  async delete(@Param('notificationId') notificationId: string) {
    await this.notificationService.deleteNotification(notificationId);

    return {
      success: true,
      message: 'Notification Deleted successfully',
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../auth/schemas/user.schema';
import { Notification } from '../schemas/notification.schema';
import { Subscription } from '../schemas/subscription.schema';
import { WebPushService } from './web-push.service';
import { PushNotificationPayload } from '../type/notification.type';
import { ObjectIdLike } from 'src/type/common.type';
import { Project } from 'src/modules/project/schema/project.schema';

@Injectable()
export class NotificationPushService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,

    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,

    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,

    private readonly webPushService: WebPushService,
  ) {}

  async pushNotificationToUser(
    userId: ObjectIdLike,
    payload: PushNotificationPayload,
  ): Promise<Notification> {
    const user = await this.userModel
      .findById(userId)
      .populate<{ subscription: Subscription }>('subscription');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const notification = await this.notificationModel.create({
      userId: user._id,
      title: payload.title,
      message: payload.message,
      projectId: payload.projectId,
      taskId: payload.taskId,
      profileImage: payload.profileImage,
    });

    if (!user.notificationPreferences) {
      return notification;
    }

    if (user.subscription) {
      await this.webPushService.sendNotification(user.subscription, {
        ...payload,
        createdAt: notification.createdAt,
        projectId: payload.projectId?.toString(),
        taskId: payload.taskId?.toString(),
      });
    }

    return notification;
  }

  async pushNotificationToProjectMembers(
    projectId: ObjectIdLike,
    payload: PushNotificationPayload,
  ): Promise<void> {
    const project = await this.projectModel
      .findById(projectId)
      .select('members.user');

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const memberIds = project.members.map((member) => member.user);

    const users = await this.userModel.find({
      _id: { $in: memberIds },
      notificationPreferences: true,
    });

    await Promise.all(
      users.map((user) => this.pushNotificationToUser(user._id, payload)),
    );
  }
}

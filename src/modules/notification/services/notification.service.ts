import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from '../schemas/notification.schema';
import { Subscription } from '../schemas/subscription.schema';
import { Project } from '../../project/schema/project.schema';
import { User } from '../../auth/schemas/user.schema';
import { ObjectIdLike } from 'src/type/common.type';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,

    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<Subscription>,

    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,

    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  async saveSubscription(dto: CreateSubscriptionDto): Promise<void> {
    const { email, subscription } = dto;

    const user = await this.userModel.findOne({ email });

    if (!user) {
      return;
    }

    const savedSubscription = await this.subscriptionModel.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      { $set: subscription },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    await this.userModel.findByIdAndUpdate(user._id, {
      subscription: savedSubscription._id,
    });
  }

  async getAllNotificationsByProject(
    userId: ObjectIdLike,
    page = 0,
    limit = 10,
  ) {
    const skip = page * limit;

    const userProjects = await this.projectModel.find(
      { 'members.user': userId },
      { _id: 1 },
    );

    const projectIds = userProjects.map((project) => project._id);

    const notifications = await this.notificationModel
      .find({ projectId: { $in: projectIds } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await this.notificationModel.countDocuments({
      projectId: { $in: projectIds },
    });

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + notifications.length < total,
      },
    };
  }

  async deleteNotification(notificationId: string): Promise<void> {
    const deleted = await this.notificationModel.deleteOne({
      _id: notificationId,
    });

    if (!deleted.deletedCount) {
      throw new NotFoundException('Notification not found');
    }
  }

  async markAllAsRead(userId: ObjectIdLike): Promise<void> {
    const userProjects = await this.projectModel.find(
      { 'members.user': userId },
      { _id: 1 },
    );

    const projectIds = userProjects.map((project) => project._id);

    await this.notificationModel.updateMany(
      {
        $or: [{ userId }, { projectId: { $in: projectIds } }],
        unread: true,
      },
      { $set: { unread: false } },
    );
  }
}

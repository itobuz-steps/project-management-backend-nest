import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationController } from './notification.controller';
import { NotificationService } from './services/notification.service';
import { NotificationCronService } from './services/notification-cron.service';
import {
  Notification,
  NotificationSchema,
} from './schemas/notification.schema';
import {
  Subscription,
  SubscriptionSchema,
} from './schemas/subscription.schema';
import { Project, ProjectSchema } from '../project/schema/project.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Task, TaskSchema } from '../tasks/entities/task.entity';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module';
import { NotificationPushService } from './services/notification-push.service';
import { WebPushService } from './services/web-push.service';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: User.name, schema: UserSchema },
      { name: Task.name, schema: TaskSchema },
    ]),
    JwtModule.register({}),
    AuthModule,
    MailModule,
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    WebPushService,
    NotificationPushService,
    NotificationCronService,
  ],
  exports: [NotificationPushService, NotificationCronService],
})
export class NotificationModule {}

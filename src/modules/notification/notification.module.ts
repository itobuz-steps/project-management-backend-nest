import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
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
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: User.name, schema: UserSchema },
    ]),
    JwtModule.register({}),
    AuthModule,
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
})
export class NotificationModule {}

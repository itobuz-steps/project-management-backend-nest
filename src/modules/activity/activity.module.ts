import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { Activity, ActivitySchema } from './schemas/activity.schemas';
import { ActivityService } from './services/activity.service';
import { ActivityController } from './activity.controller';
import { AuthModule } from '../auth/auth.module';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Task, TaskSchema } from '../tasks/entities/task.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Activity.name, schema: ActivitySchema },
      { name: User.name, schema: UserSchema },
      { name: Task.name, schema: TaskSchema },
    ]),
    JwtModule.register({}),
    AuthModule,
  ],
  controllers: [ActivityController],
  providers: [ActivityService],
  exports: [ActivityService, MongooseModule],
})
export class ActivityModule {}

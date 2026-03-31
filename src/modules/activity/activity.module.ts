import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { Activity, ActivitySchema } from './schemas/activity.schemas';
import { ActivityService } from './services/activity.service';
import { ActivityController } from './activity.controller';
import { AuthModule } from '../auth/auth.module';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { ProjectModule } from '../project/project.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Activity.name, schema: ActivitySchema },
      { name: User.name, schema: UserSchema },
    ]),
    JwtModule.register({}),
    AuthModule,
    forwardRef(() => ProjectModule),
  ],
  controllers: [ActivityController],
  providers: [ActivityService],
  exports: [ActivityService, MongooseModule],
})
export class ActivityModule {}

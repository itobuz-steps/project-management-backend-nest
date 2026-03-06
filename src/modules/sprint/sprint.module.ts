import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Sprint, SprintSchema } from './schema/sprint.schema';
import { Project, ProjectSchema } from '../project/schema/project.schema';
import { SprintService } from './sprint.service';
import { SprintController } from './sprint.controller';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { ProjectService } from '../project/services/project.service';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { ActivityModule } from '../activity/activity.module';
import { TasksModule } from '../tasks/tasks.module';
import { StorageModule } from 'src/storage/storage.module';

@Module({
  imports: [
    NotificationModule,
    MongooseModule.forFeature([
      { name: Sprint.name, schema: SprintSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: User.name, schema: UserSchema },
    ]),
    JwtModule.register({}),
    AuthModule,
    ActivityModule,
    TasksModule,
    StorageModule,
  ],
  controllers: [SprintController],
  providers: [
    SprintService,
    ProjectService,
    {
      provide: 'ProjectService',
      useExisting: ProjectService,
    },
  ],
  exports: [SprintService],
})
export class SprintModule {}

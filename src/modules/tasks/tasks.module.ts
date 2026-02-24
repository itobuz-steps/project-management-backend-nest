import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task, TaskSchema } from './entities/task.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module';
import { Project, ProjectSchema } from '../project/schema/project.schema';
import { NotificationModule } from '../notification/notification.module';
import { ActivityModule } from '../activity/activity.module';
import { ProjectService } from '../project/services/project.service';
import { StorageModule } from 'src/storage/storage.module';

@Module({
  controllers: [TasksController],
  providers: [
    TasksService,
    ProjectService,
    {
      provide: 'ProjectService',
      useExisting: ProjectService,
    },
  ],
  imports: [
    MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
    MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }]),
    JwtModule.register({}),
    AuthModule,
    NotificationModule,
    ActivityModule,
    StorageModule,
  ],
  exports: [MongooseModule],
})
export class TasksModule {}

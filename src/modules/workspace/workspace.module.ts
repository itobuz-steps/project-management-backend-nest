import { Module } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { WorkspaceController } from './workspace.controller';
import { Workspace, WorkspaceSchema } from './entities/workspace.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { ProjectService } from '../project/services/project.service';
import { Project, ProjectSchema } from '../project/schema/project.schema';
import { NotificationModule } from '../notification/notification.module';
import { TasksModule } from '../tasks/tasks.module';
import { StorageModule } from '../../storage/storage.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Workspace.name, schema: WorkspaceSchema },
    ]),
    MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }]),
    JwtModule.register({}),
    AuthModule,
    NotificationModule,
    TasksModule,
    StorageModule,
  ],
  controllers: [WorkspaceController],
  providers: [WorkspaceService, ProjectService],
})
export class WorkspaceModule {}

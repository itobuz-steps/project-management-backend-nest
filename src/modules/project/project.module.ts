import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Project, ProjectSchema } from './schema/project.schema';
import { ProjectService } from '../project/services/project.service';
import { ProjectController } from './controllers/project.controller';
import { InviteUserController } from './controllers/invite-user.controller';
import { InviteUserService } from './services/invite-user.service';
import { NotificationModule } from '../notification/notification.module';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { TasksModule } from '../tasks/tasks.module';
import { StorageModule } from 'src/storage/storage.module';
import { MailModule } from 'src/mail/mail.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [
    NotificationModule,
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: User.name, schema: UserSchema },
    ]),
    JwtModule.register({}),
    AuthModule,
    TasksModule,
    StorageModule,
    MailModule,
    forwardRef(() => ActivityModule),
  ],
  controllers: [ProjectController, InviteUserController],
  providers: [
    ProjectService,
    {
      provide: 'ProjectService',
      useExisting: ProjectService,
    },
    InviteUserService,
    RolesGuard,
  ],
  exports: [ProjectService, 'ProjectService', InviteUserService],
})
export class ProjectModule {}

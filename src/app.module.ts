import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import appConfig from './config/app.config';
import { ProjectModule } from './modules/project/project.module';
import { MailSender } from './utils/mailSender';
import { TasksModule } from './modules/tasks/tasks.module';
import { SprintModule } from './modules/sprint/sprint.module';
import { CommentModule } from './modules/comment/comment.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ActivityModule } from './modules/activity/activity.module';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
import { StorageModule } from './storage/storage.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    ServeStaticModule.forRootAsync({
      useFactory: () => {
        const uploadsPath = join(__dirname, '..', '..', 'uploads');
        console.log(`Serving static files from: ${uploadsPath}`);
        return [
          {
            rootPath: uploadsPath,
            serveRoot: '/uploads/',
          },
        ];
      },
    }),
    DatabaseModule,
    ProjectModule,
    AuthModule,
    TasksModule,
    SprintModule,
    CommentModule,
    NotificationModule,
    ActivityModule,
    ScheduleModule.forRoot(),
    StorageModule,
    WorkspaceModule,
  ],
  controllers: [AppController],
  providers: [AppService, MailSender],
})
export class AppModule {}

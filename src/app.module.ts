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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    DatabaseModule,
    ProjectModule,
    AuthModule,
    TasksModule,
    SprintModule,
  ],
  controllers: [AppController],
  providers: [AppService, MailSender],
})
export class AppModule {}

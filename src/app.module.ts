import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import appConfig from './config/app.config';
import { ProjectModule } from './modules/project/project.module';
import { MailSender } from './utils/mailSender';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    DatabaseModule,
    ProjectModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService, MailSender],
})
export class AppModule {}

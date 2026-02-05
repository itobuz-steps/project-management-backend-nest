import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Sprint, SprintSchema } from './schema/sprint.schema';
import { Project, ProjectSchema } from '../project/schema/project.schema';
import { SprintService } from './sprint.service';
import { SprintController } from './sprint.controller';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    NotificationModule,
    MongooseModule.forFeature([
      { name: Sprint.name, schema: SprintSchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
    JwtModule.register({}),
    AuthModule,
  ],
  controllers: [SprintController],
  providers: [SprintService],
  exports: [SprintService],
})
export class SprintModule {}

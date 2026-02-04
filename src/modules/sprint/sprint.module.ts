import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Sprint, SprintSchema } from './schema/sprint.schema';
import { Project, ProjectSchema } from '../project/schema/project.schema';
import { SprintService } from './sprint.service';
import { SprintController } from './sprint.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Sprint.name, schema: SprintSchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
  ],
  controllers: [SprintController],
  providers: [SprintService],
})
export class SprintModule {}

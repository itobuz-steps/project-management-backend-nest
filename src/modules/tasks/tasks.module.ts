import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task, TaskSchema } from './entities/task.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module';
import { Project, ProjectSchema } from '../project/schema/project.schema';
@Module({
  controllers: [TasksController],
  providers: [TasksService],
  imports: [
    MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
    MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }]),
    JwtModule.register({}),
    AuthModule,
  ],
})
export class TasksModule {}

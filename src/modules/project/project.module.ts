import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Project, ProjectSchema } from './schema/project.schema';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { InviteUserController } from './invite-user.controller';
import { InviteUserService } from './invite-user.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: User.name, schema: UserSchema },
    ]),
    JwtModule.register({}),
    AuthModule,
  ],
  controllers: [ProjectController, InviteUserController],
  providers: [ProjectService, InviteUserService],
  exports: [ProjectService],
})
export class ProjectModule {}

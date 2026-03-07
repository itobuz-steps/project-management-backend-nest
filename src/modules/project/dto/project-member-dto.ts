import { IsEnum, IsString } from 'class-validator';
import { ProjectRole } from '../type/project.types';

export class ProjectMemberDto {
  @IsString()
  user: string;

  @IsEnum(ProjectRole)
  role: ProjectRole;
}

import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { ProjectType } from '../type/project.types';

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsEnum(ProjectType)
  projectType: ProjectType;

  @IsOptional()
  @IsString()
  prefix?: string;

  @IsOptional()
  @IsArray()
  columns?: string[];
}

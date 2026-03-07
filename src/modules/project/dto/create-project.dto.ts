import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ProjectType } from '../type/project.types';
import { Type } from 'class-transformer';
import { ProjectMemberDto } from './project-member-dto';

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

  @IsOptional()
  @IsString()
  defaultAssignee?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  iconKey?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectMemberDto)
  members?: ProjectMemberDto[];

  @IsMongoId()
  memberLead?: string;

  @IsString()
  theme?: string;
  @IsMongoId()
  workspaceId?: string;
}

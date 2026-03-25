import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ProjectType } from '../type/project.types';
import { Transform, Type } from 'class-transformer';
import { ProjectMemberDto } from './project-member-dto';
import { transformNullableMongoId } from 'src/utils/transform.utils';

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
  @Transform(transformNullableMongoId)
  @IsMongoId()
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
  workspaceId?: string;
}

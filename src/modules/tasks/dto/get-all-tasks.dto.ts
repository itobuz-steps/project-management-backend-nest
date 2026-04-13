import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { TASK_PRIORITIES, TASK_TYPES } from 'src/constants/task.constants';
import type { TaskPriority, TaskType } from 'src/constants/task.constants';
import { Task } from '../entities/task.entity';

const SORTABLE_FIELDS: (keyof Task | 'createdAt' | 'updatedAt')[] = [
  'type',
  'title',
  'status',
  'priority',
  'dueDate',
  'key',
  'createdAt',
  'updatedAt',
];

const toArray = (value: unknown): string[] | undefined => {
  if (!value) return undefined;

  if (Array.isArray(value)) {
    return value
      .flatMap((v) => (typeof v === 'string' ? v.split(',') : []))
      .map((v) => v.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return undefined;
};

export class GetAllTasksDto {
  @ApiPropertyOptional({
    description: 'Project ID to filter tasks',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Search term for task title, description, or key',
    example: 'implement auth',
  })
  @IsOptional()
  @IsString()
  searchQuery?: string;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: SORTABLE_FIELDS,
    example: 'createdAt',
  })
  @IsOptional()
  @IsIn(SORTABLE_FIELDS)
  sortBy?: keyof Task | 'createdAt' | 'updatedAt';

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description: 'Priority filter (multi)',
    enum: TASK_PRIORITIES,
    isArray: true,
    example: ['high', 'medium'],
  })
  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsEnum(TASK_PRIORITIES, { each: true })
  priority?: TaskPriority[];

  @ApiPropertyOptional({
    description: 'Status filter (multi)',
    example: ['todo', 'in-progress'],
    isArray: true,
  })
  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsString({ each: true })
  status?: string[];

  @ApiPropertyOptional({
    description: 'Task type filter (multi)',
    enum: TASK_TYPES,
    isArray: true,
    example: ['task', 'bug'],
  })
  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsEnum(TASK_TYPES, { each: true })
  type?: TaskType[];

  @ApiPropertyOptional({
    description: 'Tags filter',
    type: [String],
    example: ['frontend', 'auth'],
  })
  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Assignee user IDs (multi)',
    type: [String],
    example: ['507f1f77bcf86cd799439011'],
  })
  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsMongoId({ each: true })
  assignee?: string[];

  @ApiPropertyOptional({
    description: 'Reporter user IDs (multi)',
    type: [String],
    example: ['507f1f77bcf86cd799439012'],
  })
  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsMongoId({ each: true })
  reporter?: string[];

  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}

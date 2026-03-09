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
    description: 'Priority filter',
    enum: TASK_PRIORITIES,
    example: 'high',
  })
  @IsOptional()
  @IsEnum(TASK_PRIORITIES)
  priority?: TaskPriority;

  @ApiPropertyOptional({
    description: 'Status filter',
    example: 'in-progress',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Task type filter',
    enum: TASK_TYPES,
    example: 'task',
  })
  @IsOptional()
  @IsEnum(TASK_TYPES)
  type?: TaskType;

  @ApiPropertyOptional({
    description: 'Tags filter. Can be comma-separated or repeated query params',
    example: 'frontend,authentication',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) {
      return undefined;
    }

    if (Array.isArray(value)) {
      return value
        .flatMap((item) => `${item}`.split(','))
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return `${value}`
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  })
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Assignee user ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsMongoId()
  assignee?: string;

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
    default: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}

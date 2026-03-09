import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
  IsMongoId,
  IsNumberString,
} from 'class-validator';
import { TASK_PRIORITIES, TASK_TYPES } from '../../../constants/task.constants';
import type { TaskPriority, TaskType } from '../../../constants/task.constants';
import {
  transformNullableMongoId,
  transformToArray,
} from 'src/utils/transform.utils';

export class CreateTaskDto {
  @ApiProperty({
    description: 'ID of the project this task belongs to',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  projectId: string;

  @ApiProperty({
    description: 'Title of the task',
    example: 'Implement authentication module',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Detailed description of the task',
    example: 'Implement JWT-based authentication with signup and verification',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Type of the task',
    enum: TASK_TYPES,
    example: 'task',
  })
  @IsEnum(TASK_TYPES)
  type: TaskType;

  @ApiProperty({
    description: 'Current status of the task',
    example: 'todo',
  })
  @IsString()
  status: string;

  @ApiProperty({
    description: 'Priority level of the task',
    enum: TASK_PRIORITIES,
    example: 'medium',
    required: false,
  })
  @IsOptional()
  @IsEnum(TASK_PRIORITIES)
  priority?: TaskPriority;

  @ApiProperty({
    description: 'Tags associated with the task',
    type: [String],
    example: ['frontend', 'authentication'],
    required: false,
  })
  @IsOptional()
  @Transform(transformToArray)
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({
    description: 'Due date for the task',
    example: '2024-12-31T23:59:59.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dueDate?: Date;

  @ApiProperty({
    description: 'User ID of the assignee',
    example: '507f1f77bcf86cd799439014',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  assignee?: string;

  @ApiProperty({
    description: 'Story points for the task',
    example: 5,
    required: false,
  })
  @IsOptional()
  @IsNumberString()
  storyPoint?: number;

  @ApiProperty({
    description: 'Sub-task IDs',
    type: [String],
    example: ['507f1f77bcf86cd799439015'],
    required: false,
  })
  @IsOptional()
  @Transform(transformToArray)
  @IsArray()
  @IsMongoId({ each: true })
  subTasks?: string[];

  @ApiProperty({
    description: 'Parent task ID',
    example: '507f1f77bcf86cd799439016',
    required: false,
  })
  @IsOptional()
  @Transform(transformNullableMongoId)
  @IsMongoId()
  parentTask?: string | null;

  @ApiProperty({
    description: 'IDs of tasks that this task blocks',
    type: [String],
    example: ['507f1f77bcf86cd799439017'],
    required: false,
  })
  @IsOptional()
  @Transform(transformToArray)
  @IsArray()
  @IsMongoId({ each: true })
  blocks?: string[];

  @ApiProperty({
    description: 'IDs of tasks that block this task',
    type: [String],
    example: ['507f1f77bcf86cd799439018'],
    required: false,
  })
  @IsOptional()
  @Transform(transformToArray)
  @IsArray()
  @IsMongoId({ each: true })
  blockedBy?: string[];

  @ApiProperty({
    description: 'IDs of related tasks',
    type: [String],
    example: ['507f1f77bcf86cd799439019'],
    required: false,
  })
  @IsOptional()
  @Transform(transformToArray)
  @IsArray()
  @IsMongoId({ each: true })
  relatesTo?: string[];

  @ApiProperty({
    description: 'IDs of duplicate tasks',
    type: [String],
    example: ['507f1f77bcf86cd799439020'],
    required: false,
  })
  @IsOptional()
  @Transform(transformToArray)
  @IsArray()
  @IsMongoId({ each: true })
  duplicates?: string[];
}

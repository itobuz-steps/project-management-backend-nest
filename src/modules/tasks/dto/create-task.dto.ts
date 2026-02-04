import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
  IsNumber,
  IsMongoId,
} from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({
    description: 'ID of the project this task belongs to',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  projectId: string;

  @ApiProperty({ description: 'Unique key for the task', example: 'TASK-001' })
  @IsString()
  key: string;

  @ApiProperty({
    description: 'Reporter of the task',
    example: '507f1f77bcf86cd799439010',
  })
  @IsMongoId()
  reporter: string;

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
    enum: ['bug', 'task', 'story'],
    example: 'task',
  })
  @IsEnum(['bug', 'task', 'story'])
  type: 'bug' | 'task' | 'story';

  @ApiProperty({
    description: 'Current status of the task',
    example: 'todo',
  })
  @IsString()
  status: string;

  @ApiProperty({
    description: 'Priority level of the task',
    enum: ['low', 'medium', 'high', 'critical'],
    example: 'medium',
    required: false,
  })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  priority?: 'low' | 'medium' | 'high' | 'critical';

  @ApiProperty({
    description: 'Tags associated with the task',
    type: [String],
    example: ['frontend', 'authentication'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({
    description: 'Task IDs that this task blocks',
    type: [String],
    example: ['507f1f77bcf86cd799439011'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  blocks?: string[];

  @ApiProperty({
    description: 'Task IDs that block this task',
    type: [String],
    example: ['507f1f77bcf86cd799439012'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  blockedBy?: string[];

  @ApiProperty({
    description: 'Related task IDs',
    type: [String],
    example: ['507f1f77bcf86cd799439013'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  relatesTo?: string[];

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
  @IsNumber()
  storyPoint?: number;

  @ApiProperty({
    description: 'Sub-task IDs',
    type: [String],
    example: ['507f1f77bcf86cd799439015'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  subTask?: string[];

  @ApiProperty({
    description: 'Attachment file URLs or IDs',
    type: [String],
    example: ['https://example.com/file.pdf'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @ApiProperty({
    description: 'Parent task ID',
    example: '507f1f77bcf86cd799439016',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  parentTask?: string;
}

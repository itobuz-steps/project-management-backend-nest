import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

// Common response schemas
const SuccessResponse = (description: string) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    result: { type: 'object', description },
  },
});

const ErrorResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    message: { type: 'string' },
  },
};

const TaskIdParam = () =>
  ApiParam({
    name: 'id',
    description: 'Task ID',
    example: '507f1f77bcf86cd799439011',
  });

export function CreateTaskDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a new task' }),
    ApiBody({ type: CreateTaskDto }),
    ApiResponse({
      status: 201,
      description: 'Task created successfully',
      schema: SuccessResponse('Created task object'),
    }),
    ApiResponse({
      status: 400,
      description: 'Bad request - validation failed',
      schema: ErrorResponse,
    }),
  );
}

export function GetAllTasksDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get all tasks',
      description:
        'Retrieve all tasks with optional filtering, searching, and sorting capabilities',
    }),
    ApiQuery({
      name: 'projectId',
      required: false,
      description: 'Filter tasks by project ID',
      example: '507f1f77bcf86cd799439011',
      type: String,
    }),
    ApiQuery({
      name: 'searchQuery',
      required: false,
      description: 'Search tasks by title or description',
      example: 'implement feature',
      type: String,
    }),
    ApiQuery({
      name: 'sortBy',
      required: false,
      description: 'Field to sort by',
      enum: [
        'title',
        'priority',
        'status',
        'dueDate',
        'createdAt',
        'updatedAt',
        'type',
        'key',
        'storyPoint',
      ],
      example: 'createdAt',
    }),
    ApiQuery({
      name: 'sortOrder',
      required: false,
      description: 'Sort order',
      enum: ['asc', 'desc'],
      example: 'desc',
    }),
    ApiQuery({
      name: 'priority',
      required: false,
      description: 'Filter tasks by priority level',
      enum: ['low', 'medium', 'high', 'critical'],
      example: 'high',
    }),
    ApiQuery({
      name: 'status',
      required: false,
      description: 'Filter tasks by status',
      example: 'in-progress',
      type: String,
    }),
    ApiQuery({
      name: 'tags',
      required: false,
      description: 'Filter tasks by tags',
      example: 'frontend',
      type: String,
      isArray: true,
    }),
    ApiQuery({
      name: 'assignee',
      required: false,
      description: 'Filter tasks by assignee user ID',
      example: '507f1f77bcf86cd799439011',
      type: String,
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully retrieved list of tasks',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          result: { type: 'array', items: { type: 'object' } },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Bad request - invalid query parameters',
      schema: ErrorResponse,
    }),
  );
}

export function GetTaskByIdDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Get a task by ID' }),
    TaskIdParam(),
    ApiResponse({
      status: 200,
      description: 'Task found',
      schema: SuccessResponse('Task object'),
    }),
    ApiResponse({
      status: 404,
      description: 'Task not found',
      schema: ErrorResponse,
    }),
  );
}

export function UpdateTaskDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Update a task' }),
    TaskIdParam(),
    ApiBody({ type: UpdateTaskDto }),
    ApiResponse({
      status: 200,
      description: 'Task updated successfully',
      schema: SuccessResponse('Updated task object'),
    }),
    ApiResponse({
      status: 404,
      description: 'Task not found',
      schema: ErrorResponse,
    }),
    ApiResponse({
      status: 400,
      description: 'Bad request - validation failed',
      schema: ErrorResponse,
    }),
  );
}

export function DeleteTaskDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Delete a task' }),
    TaskIdParam(),
    ApiResponse({
      status: 200,
      description: 'Task deleted successfully',
      schema: SuccessResponse('Deleted task object'),
    }),
    ApiResponse({
      status: 404,
      description: 'Task not found',
      schema: ErrorResponse,
    }),
  );
}

import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TASK_PRIORITIES } from 'src/constants/task.constants';

// Common error response schema
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
    ApiOperation({
      summary: 'Create a new task',
      description:
        'Creates a new task in the specified project. Supports file attachments (max 10 files).',
    }),
    ApiParam({
      name: 'projectId',
      description: 'Project ID',
      example: '507f1f77bcf86cd799439011',
    }),
    ApiResponse({
      status: 201,
      description: 'Task created successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          result: {
            type: 'object',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Bad request - validation failed',
      schema: ErrorResponse,
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized - authentication required',
      schema: ErrorResponse,
    }),
    ApiResponse({
      status: 404,
      description: 'Project not found',
      schema: ErrorResponse,
    }),
  );
}

export function GetAllTasksDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get all tasks',
      description:
        'Retrieve all tasks for the specified project with optional filtering, searching, and sorting capabilities',
    }),
    ApiParam({
      name: 'projectId',
      description: 'Project ID',
      example: '507f1f77bcf86cd799439011',
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
        'status',
        'priority',
        'dueDate',
        'createdAt',
        'updatedAt',
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
      enum: TASK_PRIORITIES,
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
      description: 'Filter tasks by tags (comma-separated)',
      example: 'frontend,authentication',
      type: String,
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
          result: {
            type: 'array',
            items: {
              type: 'object',
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Bad request - invalid query parameters',
      schema: ErrorResponse,
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized - authentication required',
      schema: ErrorResponse,
    }),
    ApiResponse({
      status: 404,
      description: 'Project not found',
      schema: ErrorResponse,
    }),
  );
}

export function GetTaskStatsDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Get task stats',
      description:
        'Retrieve task statistics for the authenticated user, including total assigned tasks, weekly completed tasks, story points completed, and daily completion counts.',
    }),
    ApiResponse({
      status: 200,
      description: 'Task stats retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          result: {
            type: 'object',
            properties: {
              totalAssignedTasks: { type: 'number', example: 12 },
              tasksCompletedThisWeek: { type: 'number', example: 4 },
              storyPointsCompletedThisWeek: { type: 'number', example: 18 },
              tasksCompletedEachDay: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    date: { type: 'string', example: '2026-02-18' },
                    count: { type: 'number', example: 2 },
                  },
                },
              },
              allTasksGroupedByProject: {
                type: 'array',
                items: { type: 'object' },
              },
              completedTasksGroupedByProject: {
                type: 'array',
                items: { type: 'object' },
              },
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized - authentication required',
      schema: ErrorResponse,
    }),
  );
}

export function GetTaskByIdDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get a task by ID',
      description: 'Retrieve detailed information about a specific task',
    }),
    ApiParam({
      name: 'projectId',
      description: 'Project ID',
      example: '507f1f77bcf86cd799439011',
    }),
    TaskIdParam(),
    ApiResponse({
      status: 200,
      description: 'Task found successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          result: {
            type: 'object',
          },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized - authentication required',
      schema: ErrorResponse,
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
    ApiOperation({
      summary: 'Update a task',
      description:
        'Update specific fields of an existing task. All fields are optional.',
    }),
    ApiParam({
      name: 'projectId',
      description: 'Project ID',
      example: '507f1f77bcf86cd799439011',
    }),
    TaskIdParam(),
    ApiBody({ type: UpdateTaskDto }),
    ApiResponse({
      status: 200,
      description: 'Task updated successfully',
      schema: {
        type: 'object',
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Bad request - validation failed',
      schema: ErrorResponse,
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized - authentication required',
      schema: ErrorResponse,
    }),
    ApiResponse({
      status: 404,
      description: 'Task not found',
      schema: ErrorResponse,
    }),
  );
}

export function DeleteTaskDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Delete a task',
    }),
    ApiParam({
      name: 'projectId',
      description: 'Project ID',
      example: '507f1f77bcf86cd799439011',
    }),
    TaskIdParam(),
    ApiResponse({
      status: 200,
      description: 'Task deleted successfully',
      schema: {
        type: 'object',
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized - authentication required',
      schema: ErrorResponse,
    }),
    ApiResponse({
      status: 404,
      description: 'Task not found',
      schema: ErrorResponse,
    }),
  );
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { IsAuthenticated } from 'src/middlewares/isAuthenticated';
import type { AuthenticatedRequest } from 'src/type/common.type';
import type { TaskFilters } from './interfaces/tasks.interface';

@UseGuards(IsAuthenticated)
@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiBody({ type: CreateTaskDto })
  @ApiResponse({
    status: 201,
    description: 'Task created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        result: {
          type: 'object',
          description: 'Created task object',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    const result = await this.tasksService.create(req.user._id, createTaskDto);

    return { success: true, result };
  }

  @Get()
  @ApiOperation({
    summary: 'Get all tasks',
    description:
      'Retrieve all tasks with optional filtering, searching, and sorting capabilities',
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    description: 'Filter tasks by project ID',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @ApiQuery({
    name: 'searchQuery',
    required: false,
    description: 'Search tasks by title or description',
    example: 'implement feature',
    type: String,
  })
  @ApiQuery({
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
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    description: 'Filter tasks by priority level',
    enum: ['low', 'medium', 'high', 'critical'],
    example: 'high',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter tasks by status',
    example: 'in-progress',
    type: String,
  })
  @ApiQuery({
    name: 'tags',
    required: false,
    description: 'Filter tasks by tags (comma-separated)',
    example: 'frontend,urgent',
    type: String,
    isArray: true,
  })
  @ApiQuery({
    name: 'assignee',
    required: false,
    description: 'Filter tasks by assignee user ID',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved list of tasks',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
          description: 'Indicates if the request was successful',
        },
        result: {
          type: 'array',
          description: 'Array of task objects matching the filter criteria',
          items: {
            type: 'object',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid query parameters',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Invalid query parameters' },
      },
    },
  })
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query() query?: TaskFilters,
  ) {
    const result = await this.tasksService.findAll(req.user._id, query);

    return { success: true, result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a task by ID' })
  @ApiParam({
    name: 'id',
    description: 'Task ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Task found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        result: {
          type: 'object',
          description: 'Task object',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const result = await this.tasksService.findOne(req.user._id, id);
    return { success: true, result };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task' })
  @ApiParam({
    name: 'id',
    description: 'Task ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({ type: UpdateTaskDto })
  @ApiResponse({
    status: 200,
    description: 'Task updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        result: {
          type: 'object',
          description: 'Updated task object',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.tasksService.update(
      req.user._id,
      id,
      updateTaskDto,
    );
    return { success: true, result };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  @ApiParam({
    name: 'id',
    description: 'Task ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Task deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        result: {
          type: 'object',
          description: 'Deleted task object',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const result = await this.tasksService.delete(req.user._id, id);
    return { success: true, result };
  }
}

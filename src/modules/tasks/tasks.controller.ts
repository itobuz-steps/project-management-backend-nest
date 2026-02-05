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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { IsAuthenticated } from 'src/middlewares/isAuthenticated';

@UseGuards(IsAuthenticated)
@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}
  s;
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
  async create(@Body() createTaskDto: CreateTaskDto) {
    const result = await this.tasksService.create(createTaskDto);
    return { success: true, result };
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks' })
  @ApiResponse({
    status: 200,
    description: 'List of all tasks',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        result: {
          type: 'array',
          items: { type: 'object' },
          description: 'Array of task objects',
        },
      },
    },
  })
  async findAll(@Req() req: Request & { user?: any }) {
    console.log('Authenticated user:', req.user);
    const result = await this.tasksService.findAll();
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
  async findOne(@Param('id') id: string) {
    const result = await this.tasksService.findOne(id);
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
  async update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    const result = await this.tasksService.update(id, updateTaskDto);
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
  async remove(@Param('id') id: string) {
    const result = await this.tasksService.remove(id);
    return { success: true, result };
  }
}

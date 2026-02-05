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
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { IsAuthenticated } from 'src/middlewares/isAuthenticated';
import type { AuthenticatedRequest } from 'src/type/common.type';
import type { TaskFilters } from './interfaces/tasks.interface';
import {
  CreateTaskDocs,
  GetAllTasksDocs,
  GetTaskByIdDocs,
  UpdateTaskDocs,
  DeleteTaskDocs,
} from './tasks.swagger';
import { multerOptionsForMultipleFiles } from 'src/config/multer.config';

@UseGuards(IsAuthenticated)
@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @CreateTaskDocs()
  @UseInterceptors(
    FilesInterceptor('attachments', 10, multerOptionsForMultipleFiles),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'ID of the project this task belongs to',
        },
        title: { type: 'string', description: 'Title of the task' },
        description: {
          type: 'string',
          description: 'Detailed description of the task',
        },
        type: { type: 'string', description: 'Type of the task' },
        status: { type: 'string', description: 'Current status of the task' },
        priority: { type: 'string', description: 'Priority level of the task' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags associated with the task',
        },
        dueDate: {
          type: 'string',
          format: 'date-time',
          description: 'Due date for the task',
        },
        assignee: { type: 'string', description: 'User ID of the assignee' },
        storyPoint: {
          type: 'number',
          description: 'Story points for the task',
        },
        attachments: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Optional attachment files (max 10)',
        },
      },
      required: ['projectId', 'title', 'type', 'status'],
    },
  })
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() createTaskDto: CreateTaskDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    if (files && files.length > 0) {
      createTaskDto.attachments = files.map((file) => file.filename);
    }
    const result = await this.tasksService.create(req.user._id, createTaskDto);
    return { success: true, result };
  }

  @Get()
  @GetAllTasksDocs()
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query() query?: TaskFilters,
  ) {
    const result = await this.tasksService.findAll(req.user._id, query);
    return { success: true, result };
  }

  @Get(':id')
  @GetTaskByIdDocs()
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const result = await this.tasksService.findOne(req.user._id, id);
    return { success: true, result };
  }

  @Patch(':id')
  @UpdateTaskDocs()
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
  @DeleteTaskDocs()
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const result = await this.tasksService.delete(req.user._id, id);
    return { success: true, result };
  }
}

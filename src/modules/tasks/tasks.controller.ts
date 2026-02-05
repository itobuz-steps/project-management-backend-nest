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
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
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

@UseGuards(IsAuthenticated)
@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @CreateTaskDocs()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() createTaskDto: CreateTaskDto,
  ) {
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

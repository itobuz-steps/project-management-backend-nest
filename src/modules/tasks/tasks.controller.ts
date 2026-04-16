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
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { GetAllTasksDto } from './dto/get-all-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { IsAuthenticated } from 'src/middlewares/isAuthenticated';
import type { AuthenticatedRequest } from 'src/type/common.type';
import {
  CreateTaskDocs,
  GetAllTasksDocs,
  GetTaskByIdDocs,
  UpdateTaskDocs,
  DeleteTaskDocs,
  GetTaskStatsDocs,
} from './tasks.swagger';
import { multerOptionsForMultipleFiles } from 'src/config/multer.config';

@UseGuards(IsAuthenticated)
@ApiTags('tasks')
@ApiBearerAuth()
// @Controller('project/:projectId/tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @CreateTaskDocs()
  @UseInterceptors(
    FilesInterceptor('attachments', 10, multerOptionsForMultipleFiles),
  )
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() createTaskDto: CreateTaskDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const result = await this.tasksService.create(
      req.user._id,
      req.user.role,
      createTaskDto,
      files,
    );
    return { success: true, result };
  }

  @Get('stats')
  @GetTaskStatsDocs()
  async getStats(@Req() req: AuthenticatedRequest) {
    const result = await this.tasksService.getStats(req.user._id);

    return {
      success: true,
      result,
    };
  }

  @Get()
  @GetAllTasksDocs()
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query() query?: GetAllTasksDto,
  ) {
    const result = await this.tasksService.findAll(
      req.user._id,
      req.user.role,
      query,
    );
    return { success: true, result };
  }

  @Get(':id')
  @GetTaskByIdDocs()
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const result = await this.tasksService.findOne(
      req.user._id,
      req.user.role,
      id,
    );
    return { success: true, result };
  }

  @Patch(':id')
  @UpdateTaskDocs()
  @UseInterceptors(
    FilesInterceptor('attachments', 10, multerOptionsForMultipleFiles),
  )
  @ApiConsumes('multipart/form-data')
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Req() req: AuthenticatedRequest,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const result = await this.tasksService.update(
      req.user._id,
      req.user.role,
      id,
      updateTaskDto,
      files,
    );
    return { success: true, result };
  }

  @Delete(':id')
  @DeleteTaskDocs()
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const result = await this.tasksService.delete(
      req.user._id,
      req.user.role,
      id,
    );
    return { success: true, result };
  }

  @Post(':taskId/start-timer')
  async startTimer(
    @Param('taskId') taskId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.tasksService.startTimer(
      req.user._id,
      req.user.role,
      taskId,
    );
    return { success: true, result };
  }

  @Get(':taskId/total-time-tracked')
  async getTotalTimeTracked(
    @Param('taskId') taskId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.tasksService.getTotalTimeTracked(
      req.user._id,
      req.user.role,
      taskId,
    );
    return { success: true, result };
  }

  @Patch('stop-timer/:worklogId')
  async stopTimer(
    @Param('worklogId') worklogId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.tasksService.stopTimer(
      req.user._id,
      req.user.role,
      worklogId,
    );
    return { success: true, result };
  }

  @Get(':taskId/worklogs')
  async getWorklogs(
    @Param('taskId') taskId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.tasksService.getWorklogsForTask(
      req.user._id,
      req.user.role,
      taskId,
    );
    return { success: true, result };
  }
}

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
    @Query() query?: TaskFilters,
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
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Req() req: AuthenticatedRequest,
  ) {
    console.log(
      'CONTROLLER - Raw body received:',
      JSON.stringify(updateTaskDto, null, 2),
    );
    console.log('CONTROLLER - Has assignee?', 'assignee' in updateTaskDto);
    console.log('CONTROLLER - assignee value:', updateTaskDto.assignee);

    const result = await this.tasksService.update(
      req.user._id,
      req.user.role,
      id,
      updateTaskDto,
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
}

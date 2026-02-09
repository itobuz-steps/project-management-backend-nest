import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SprintService } from './sprint.service';
import type { AuthenticatedRequest } from 'src/type/common.type';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { RemoveTaskFromSprintDto } from './dto/remove-task-from-sprint.dto';
import { AddTasksToSprintDto } from './dto/add-tasks-to-sprint.dto';
import { IsAuthenticated } from 'src/middlewares/isAuthenticated';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('/project/:projectId/sprint')
@UseGuards(IsAuthenticated)
@ApiBearerAuth()
export class SprintController {
  constructor(private readonly sprintService: SprintService) {}

  @Get()
  async getAllSprints(
    @Req() req: AuthenticatedRequest,
    @Query('projectId') projectId?: string,
  ) {
    const result = projectId
      ? await this.sprintService.getSprintsByProjectId(req.user._id, projectId)
      : await this.sprintService.getAllSprints();

    return {
      success: true,
      result,
    };
  }

  @Get(':sprintId')
  async getSprintById(
    @Req() req: AuthenticatedRequest,
    @Param('sprintId') sprintId: string,
  ) {
    const sprint = await this.sprintService.getSprintById(
      req.user._id,
      sprintId,
    );

    return {
      success: true,
      result: sprint,
    };
  }

  @Post()
  async createSprint(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateSprintDto,
  ) {
    return {
      success: true,
      result: await this.sprintService.createSprint(req.user._id, dto),
      message: 'Sprint created successfully',
    };
  }

  @Put(':sprintId')
  async updateSprint(
    @Req() req: AuthenticatedRequest,
    @Param('sprintId') sprintId: string,
    @Body() dto: UpdateSprintDto,
  ) {
    return {
      success: true,
      result: await this.sprintService.updateSprint(
        req.user._id,
        sprintId,
        dto,
      ),
      message: 'Sprint updated successfully',
    };
  }

  @Delete(':sprintId')
  async deleteSprint(
    @Req() req: AuthenticatedRequest,
    @Param('sprintId') sprintId: string,
  ) {
    return {
      success: true,
      result: await this.sprintService.deleteSprint(req.user._id, sprintId),
      message: 'Sprint successfully deleted',
    };
  }

  @Patch(':sprintId/add-tasks')
  async addTasksIntoSprint(
    @Req() req: AuthenticatedRequest,
    @Param('sprintId') sprintId: string,
    @Body() dto: AddTasksToSprintDto,
  ) {
    return {
      success: true,
      result: await this.sprintService.addTasksIntoSprint(
        req.user._id,
        sprintId,
        dto.tasks,
      ),
      message: 'Tasks added into sprint successfully',
    };
  }

  @Patch(':sprintId/remove-task')
  async removeTaskFromSprint(
    @Req() req: AuthenticatedRequest,
    @Param('sprintId') sprintId: string,
    @Body() dto: RemoveTaskFromSprintDto,
  ) {
    return {
      success: true,
      result: await this.sprintService.removeTaskFromSprint(
        req.user._id,
        sprintId,
        dto.task,
      ),
      message: 'Sprint tasks updated successfully',
    };
  }
}

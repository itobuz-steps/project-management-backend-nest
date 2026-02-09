import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
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
import { Roles } from 'src/common/decorators/roles.decorator';
import { ProjectRole } from '../project/type/project.types';

@Controller('/project/:projectId/sprint')
@UseGuards(IsAuthenticated)
@ApiBearerAuth()
export class SprintController {
  constructor(private readonly sprintService: SprintService) {}

  @Get()
  async getAllSprints(
    @Req() req: AuthenticatedRequest,
    @Param('projectId') projectId: string,
  ) {
    const result = await this.sprintService.getSprintsByProjectId(
      req.user._id,
      projectId,
      req.user.role,
    );

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
      req.user.role,
    );

    return {
      success: true,
      result: sprint,
    };
  }

  @Post()
  @Roles(ProjectRole.ADMIN)
  async createSprint(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateSprintDto,
    @Param('projectId') projectId: string,
  ) {
    return {
      success: true,
      result: await this.sprintService.createSprint(
        req.user._id,
        projectId,
        dto,
        req.user.role,
      ),
      message: 'Sprint created successfully',
    };
  }

  @Put(':sprintId')
  @Roles(ProjectRole.ADMIN)
  async updateSprint(
    @Req() req: AuthenticatedRequest,
    @Param('sprintId') sprintId: string,
    @Body() dto: UpdateSprintDto,
    @Param('projectId') projectId: string,
  ) {
    return {
      success: true,
      result: await this.sprintService.updateSprint(
        req.user._id,
        projectId,
        sprintId,
        dto,
        req.user.role,
      ),
      message: 'Sprint updated successfully',
    };
  }

  @Delete(':sprintId')
  @Roles(ProjectRole.ADMIN)
  async deleteSprint(
    @Req() req: AuthenticatedRequest,
    @Param('sprintId') sprintId: string,
    @Param('projectId') projectId: string,
  ) {
    return {
      success: true,
      result: await this.sprintService.deleteSprint(
        req.user._id,
        projectId,
        sprintId,
        req.user.role,
      ),
      message: 'Sprint successfully deleted',
    };
  }

  @Patch(':sprintId/add-tasks')
  @Roles(ProjectRole.ADMIN)
  async addTasksIntoSprint(
    @Req() req: AuthenticatedRequest,
    @Param('sprintId') sprintId: string,
    @Body() dto: AddTasksToSprintDto,
    @Param('projectId') projectId: string,
  ) {
    return {
      success: true,
      result: await this.sprintService.addTasksIntoSprint(
        req.user._id,
        projectId,
        sprintId,
        dto.tasks,
        req.user.role,
      ),
      message: 'Tasks added into sprint successfully',
    };
  }

  @Patch(':sprintId/remove-task')
  @Roles(ProjectRole.ADMIN)
  async removeTaskFromSprint(
    @Req() req: AuthenticatedRequest,
    @Param('sprintId') sprintId: string,
    @Body() dto: RemoveTaskFromSprintDto,
    @Param('projectId') projectId: string,
  ) {
    return {
      success: true,
      result: await this.sprintService.removeTaskFromSprint(
        req.user._id,
        projectId,
        sprintId,
        dto.task,
        req.user.role,
      ),
      message: 'Sprint tasks updated successfully',
    };
  }
}

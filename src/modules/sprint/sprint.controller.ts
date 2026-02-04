import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { SprintService } from './sprint.service';
import type { AuthenticatedRequest } from 'src/type/common.type';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { CreateSprintDto } from './dto/create-sprint.dto';

@Controller('sprint')
export class SprintController {
  constructor(private readonly sprintService: SprintService) {}

  // GET /sprint?projectId=xxx
  @Get()
  async getAllSprints(
    @Req() req: AuthenticatedRequest,
    @Query('projectId') projectId?: string,
  ) {
    // const userId = req.user._id;
    const userId = process.env.MY_USER;

    const result = projectId
      ? await this.sprintService.getSprintsByProjectId(userId, projectId)
      : await this.sprintService.getAllSprints();

    return {
      success: true,
      result,
    };
  }

  // GET /sprint/:id
  @Get(':id')
  async getSprintById(
    @Req() req: AuthenticatedRequest,
    @Param('id') sprintId: string,
  ) {
    // const userId = req.user._id;
    const userId = process.env.MY_USER;

    const sprint = await this.sprintService.getSprintById(userId, sprintId);

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
    const userId = process.env.MY_USER;
    return {
      success: true,
      result: await this.sprintService.createSprint(userId, dto),
      message: 'Sprint created successfully',
    };
  }

  @Put(':id')
  async updateSprint(
    @Req() req: AuthenticatedRequest,
    @Param('id') sprintId: string,
    @Body() dto: UpdateSprintDto,
  ) {
    const userId = process.env.MY_USER;
    return {
      success: true,
      result: await this.sprintService.updateSprint(userId, sprintId, dto),
      message: 'Sprint updated successfully',
    };
  }

  @Delete(':id')
  async deleteSprint(
    @Req() req: AuthenticatedRequest,
    @Param('id') sprintId: string,
  ) {
    const userId = process.env.MY_USER;
    return {
      success: true,
      result: await this.sprintService.deleteSprint(userId, sprintId),
      message: 'Sprint successfully deleted',
    };
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import type { AuthenticatedRequest } from 'src/type/common.type';
import { IsAuthenticated } from 'src/middlewares/isAuthenticated';
import { Role } from '../auth/types/auth.types';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('project')
@UseGuards(IsAuthenticated)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  async getAllProjects(@Req() req: AuthenticatedRequest) {
    return this.projectService.getAllProjects(req.user._id, req.user.role);
  }

  @Get('user-projects')
  async getProjectsByUserId(@Req() req: AuthenticatedRequest) {
    return {
      success: true,
      result: await this.projectService.getProjectsByUserId(req.user._id),
    };
  }

  @Get(':projectId')
  async getProjectById(
    @Req() req: AuthenticatedRequest,
    @Param('projectId') projectId: string,
  ) {
    return {
      success: true,
      result: await this.projectService.getProjectById(req.user._id, projectId),
    };
  }

  @Get('/:projectId/get-user/')
  async getUserByProjectId(@Param('projectId') projectId: string) {
    const project = await this.projectService.getUserByProjectId(projectId);

    const users = project.members.map((member) => member.user);

    return {
      success: true,
      result: users,
    };
  }

  @Post()
  @Roles(Role.ADMIN)
  async createProject(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateProjectDto,
  ) {
    return {
      success: true,
      result: await this.projectService.createProject(req.user._id, dto),
      message: 'Project created successfully',
    };
  }

  @Put(':projectId')
  @Roles(Role.ADMIN)
  async updateProject(
    @Param('projectId') projectId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateProjectDto,
  ) {
    return {
      success: true,
      result: await this.projectService.updateProject(
        req.user._id,
        projectId,
        dto,
      ),
      message: 'Project updated successfully',
    };
  }

  @Delete(':projectId')
  @Roles(Role.ADMIN)
  async deleteProject(
    @Param('projectId') projectId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return {
      success: true,
      result: await this.projectService.deleteProject(req.user._id, projectId),
      message: 'Project successfully deleted',
    };
  }
}

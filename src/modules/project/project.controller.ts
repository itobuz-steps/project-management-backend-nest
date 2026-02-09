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
      result: await this.projectService.getProjectById(
        req.user._id,
        projectId,
        req.user.role,
      ),
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
  async createProject(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateProjectDto,
  ) {
    return {
      success: true,
      result: await this.projectService.createProject(
        req.user._id,
        req.user.role,
        dto,
      ),
      message: 'Project created successfully',
    };
  }

  @Put(':projectId')
  async updateProject(
    @Param('projectId') projectId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateProjectDto,
  ) {
    return {
      success: true,
      result: await this.projectService.updateProject(
        req.user._id,
        req.user.role,
        projectId,
        dto,
      ),
      message: 'Project updated successfully',
    };
  }

  @Delete(':projectId')
  async deleteProject(
    @Param('projectId') projectId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return {
      success: true,
      result: await this.projectService.deleteProject(
        req.user._id,
        req.user.role,
        projectId,
      ),
      message: 'Project successfully deleted',
    };
  }
}

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
import { RolesGuard } from 'src/common/guards/roles.guard';

@Controller('project')
@UseGuards(IsAuthenticated, RolesGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  @Roles(Role.ADMIN)
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

  @Get(':id')
  async getProjectById(
    @Req() req: AuthenticatedRequest,
    @Param('id') projectId: string,
  ) {
    return {
      success: true,
      result: await this.projectService.getProjectById(req.user._id, projectId),
    };
  }

  @Get('/:id/get-user/')
  async getUserByProjectId(@Param('id') projectId: string) {
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

  @Put(':id')
  @Roles(Role.ADMIN)
  async updateProject(
    @Param('id') projectId: string,
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

  @Delete(':id')
  @Roles(Role.ADMIN)
  async deleteProject(
    @Param('id') projectId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return {
      success: true,
      result: await this.projectService.deleteProject(req.user._id, projectId),
      message: 'Project successfully deleted',
    };
  }
}

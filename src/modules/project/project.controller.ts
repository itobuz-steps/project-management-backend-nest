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
} from '@nestjs/common';
import type { Request } from 'express';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import type { AuthenticatedRequest } from 'src/type/common.type';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  async getAllProjects(@Req() req: AuthenticatedRequest) {
    // const userId = req.user._id;
    const userId = process.env.MY_USER;

    return this.projectService.getAllProjects(userId);
  }

  // GET /projects/user-projects
  @Get('user-projects')
  async getProjectsByUserId(@Req() req: AuthenticatedRequest) {
    // const userId = req.user._id;
    const userId = process.env.MY_USER;
    return {
      success: true,
      result: await this.projectService.getProjectsByUserId(userId),
    };
  }

  @Get(':id')
  async getProjectById(
    // @Req() req: AuthenticatedRequest,
    @Param('id') projectId: string,
  ) {
    // const userId = req.user._id;
    const userId = process.env.MY_USER;
    return {
      success: true,
      result: await this.projectService.getProjectById(userId, projectId),
    };
  }

  @Get('get-user/:id')
  async getUserByProjectId(@Param('id') projectId: string) {
    const project = await this.projectService.getUserByProjectId(projectId);

    const users = project.members.map((member) => member.user);

    return {
      success: true,
      result: users,
    };
  }

  @Post()
  async createProject(
    // @Headers('x-user-id') userId: string,
    @Body() dto: CreateProjectDto,
  ) {
    const userId = process.env.MY_USER;
    return {
      success: true,
      result: await this.projectService.createProject(userId, dto),
      message: 'Project created successfully',
    };
  }

  // PUT /projects/:id
  @Put(':id')
  async updateProject(
    @Param('id') projectId: string,
    // @Headers('x-user-id') userId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    const userId = process.env.MY_USER;
    return {
      success: true,
      result: await this.projectService.updateProject(userId, projectId, dto),
      message: 'Project updated successfully',
    };
  }

  // DELETE /projects/:id
  @Delete(':id')
  async deleteProject(
    @Param('id') projectId: string,
    // @Headers('x-user-id') userId: string,
  ) {
    const userId = process.env.MY_USER;
    return {
      success: true,
      result: await this.projectService.deleteProject(userId, projectId),
      message: 'Project successfully deleted',
    };
  }
}

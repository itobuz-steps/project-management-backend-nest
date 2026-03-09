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
import { ProjectService } from '../services/project.service';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import type { AuthenticatedRequest } from 'src/type/common.type';
import { IsAuthenticated } from 'src/middlewares/isAuthenticated';
import { ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadedFile, UseInterceptors } from '@nestjs/common';
import { multerOptionsForSingleFile } from 'src/config/multer.config';

@Controller('project')
@ApiBearerAuth()
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
  @UseInterceptors(FileInterceptor('icon', multerOptionsForSingleFile))
  async createProject(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateProjectDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return {
      success: true,
      result: await this.projectService.createProject(
        req.user._id,
        req.user.role,
        dto,
        file,
      ),
      message: 'Project created successfully',
    };
  }

  @Put(':projectId')
  @UseInterceptors(FileInterceptor('icon', multerOptionsForSingleFile))
  async updateProject(
    @Param('projectId') projectId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateProjectDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return {
      success: true,
      result: await this.projectService.updateProject(
        req.user._id,
        req.user.role,
        projectId,
        dto,
        file,
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

  @Delete(':projectId/columns/:columnName')
  async deleteColumn(
    @Param('projectId') projectId: string,
    @Param('columnName') columnName: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return {
      success: true,
      result: await this.projectService.deleteColumn(
        req.user._id,
        req.user.role,
        projectId,
        columnName,
      ),
      message: 'Column successfully deleted',
    };
  }
}

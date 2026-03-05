import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Req,
} from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { IsAuthenticated } from 'src/middlewares/isAuthenticated';
import type { AuthenticatedRequest } from 'src/type/common.type';

@UseGuards(IsAuthenticated)
@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post()
  async create(@Body() createWorkspaceDto: CreateWorkspaceDto) {
    const result = await this.workspaceService.create(createWorkspaceDto);
    return {
      success: true,
      result,
    };
  }

  @Get()
  async findAll(@Req() req: AuthenticatedRequest) {
    const result = await this.workspaceService.findAll(
      req.user._id,
      req.user.role,
    );
    return { success: true, result };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const result = await this.workspaceService.findOne(id);
    return { success: true, result };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateWorkspaceDto: UpdateWorkspaceDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.workspaceService.update(
      id,
      updateWorkspaceDto,
      req.user.role,
    );
    return {
      success: true,
      result,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const result = await this.workspaceService.delete(id, req.user.role);
    return { success: true, result };
  }
}

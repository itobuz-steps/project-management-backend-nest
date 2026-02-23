import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsAuthenticated } from '../../../middlewares/isAuthenticated';
import { InviteUserService } from '../services/invite-user.service';
import { InviteUserDto } from '../dto/invite-user.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ProjectRole } from '../type/project.types';
import type { AuthenticatedRequest } from 'src/type/common.type';

@Controller('project/')
@UseGuards(IsAuthenticated)
@ApiBearerAuth()
export class InviteUserController {
  constructor(private readonly inviteUserService: InviteUserService) {}

  @Post('/:projectId/invites/send')
  @Roles(ProjectRole.ADMIN)
  inviteUsers(
    @Param('projectId') projectId: string,
    @Body() dto: InviteUserDto,
  ) {
    return this.inviteUserService.inviteUsers(projectId, dto);
  }

  @Get('invites/accept')
  @UseGuards(IsAuthenticated)
  acceptUsersInvite(
    @Req() req: AuthenticatedRequest,
    @Query('token') token?: string,
  ) {
    return this.inviteUserService.acceptUsersInvite(token, req.user);
  }
}

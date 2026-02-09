import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { IsAuthenticated } from '../../../middlewares/isAuthenticated';
import type { UserDocument } from '../../auth/schemas/user.schema';
import { InviteUserService } from '../services/invite-user.service';
import { InviteUserDto } from '../dto/invite-user.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

type AuthenticatedRequest = Request & { user?: UserDocument };

@Controller('projects/:projectId/invites')
@ApiBearerAuth()
export class InviteUserController {
  constructor(private readonly inviteUserService: InviteUserService) {}

  @Post('send')
  @UseGuards(IsAuthenticated)
  inviteUsers(@Body() dto: InviteUserDto) {
    return this.inviteUserService.inviteUsers(dto);
  }

  @Get('accept')
  @UseGuards(IsAuthenticated)
  acceptUsersInvite(
    @Req() req: AuthenticatedRequest,
    @Query('token') token?: string,
  ) {
    return this.inviteUserService.acceptUsersInvite(token, req.user);
  }
}

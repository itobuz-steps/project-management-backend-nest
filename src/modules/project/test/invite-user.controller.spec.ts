/// <reference types="jest" />

jest.mock('src/middlewares/isAuthenticated', () => ({
  IsAuthenticated: class IsAuthenticated {
    canActivate(): boolean {
      return true;
    }
  },
}));

jest.mock('src/common/guards/roles.guard', () => ({
  RolesGuard: class RolesGuard {
    canActivate(): boolean {
      return true;
    }
  },
}));

jest.mock('../services/invite-user.service', () => ({
  InviteUserService: class InviteUserService {
    inviteUsers = jest.fn();
    acceptUsersInvite = jest.fn();
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { InviteUserController } from '../controllers/invite-user.controller';
import { InviteUserService } from '../services/invite-user.service';

describe('InviteUserController', () => {
  let controller: InviteUserController;

  const inviteUserService = {
    inviteUsers: jest.fn(),
    acceptUsersInvite: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InviteUserController],
      providers: [{ provide: InviteUserService, useValue: inviteUserService }],
    }).compile();

    controller = module.get<InviteUserController>(InviteUserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('inviteUsers should delegate to service', async () => {
    const req = { user: { _id: 'user-1' } };
    const dto = { email: 'member@example.com' };

    inviteUserService.inviteUsers.mockResolvedValue({ success: true });

    const result = await controller.inviteUsers(
      req as never,
      'project-1',
      dto as never,
    );

    expect(inviteUserService.inviteUsers).toHaveBeenCalledWith(
      'project-1',
      dto,
      'user-1',
    );
    expect(result).toEqual({ success: true });
  });

  it('acceptUsersInvite should pass token and authenticated user', async () => {
    const req = {
      user: {
        _id: 'user-1',
        email: 'member@example.com',
      },
    };

    inviteUserService.acceptUsersInvite.mockResolvedValue({
      success: true,
      message: 'Invite accepted and user added to the project',
    });

    const result = await controller.acceptUsersInvite(
      req as never,
      'token-123',
    );

    expect(inviteUserService.acceptUsersInvite).toHaveBeenCalledWith(
      'token-123',
      req.user,
    );
    expect(result).toEqual({
      success: true,
      message: 'Invite accepted and user added to the project',
    });
  });
});

/// <reference types="jest" />

jest.mock('../schema/project.schema', () => ({
  Project: class Project {},
}));

jest.mock('src/modules/auth/schemas/user.schema', () => ({
  User: class User {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InviteUserService } from '../services/invite-user.service';
import { ProjectRole } from '../type/project.types';
import { MailService } from 'src/mail/mail.service';

describe('InviteUserService', () => {
  let service: InviteUserService;

  const projectModel = {
    findById: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
    exists: jest.fn(),
  };

  const userModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
  };

  const mailService = {
    sendInvitationMail: jest.fn(),
  };

  const jwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const configService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InviteUserService,
        { provide: getModelToken('Project'), useValue: projectModel },
        { provide: getModelToken('User'), useValue: userModel },
        { provide: MailService, useValue: mailService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<InviteUserService>(InviteUserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('inviteUsers should throw when project does not exist', async () => {
    projectModel.findById.mockResolvedValue(null);

    await expect(
      service.inviteUsers(
        'project-1',
        { email: 'member@example.com' } as never,
        'user-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('inviteUsers should throw when user already exists in project', async () => {
    projectModel.findById.mockResolvedValue({
      _id: 'project-1',
      name: 'Alpha',
    });
    userModel.findOne.mockResolvedValue({ _id: 'user-2' });
    projectModel.findOne.mockResolvedValue({ _id: 'project-1' });

    await expect(
      service.inviteUsers(
        'project-1',
        { email: 'member@example.com' } as never,
        'user-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('inviteUsers should send invitation email with signed token', async () => {
    projectModel.findById.mockResolvedValue({
      _id: 'project-1',
      name: 'Alpha',
    });
    userModel.findOne.mockResolvedValue(null);
    userModel.findById.mockResolvedValue({ name: 'Inviter Name' });
    configService.get
      .mockReturnValueOnce('invite-secret')
      .mockReturnValueOnce('7d');
    jwtService.sign.mockReturnValue('signed-token');

    const result = await service.inviteUsers(
      'project-1',
      { email: 'member@example.com' } as never,
      'user-1',
    );

    expect(jwtService.sign).toHaveBeenCalledWith(
      { email: 'member@example.com', projectId: 'project-1' },
      { secret: 'invite-secret', expiresIn: '7d' },
    );
    expect(mailService.sendInvitationMail).toHaveBeenCalledWith(
      'member@example.com',
      'signed-token',
      'Alpha',
      'Inviter Name',
    );
    expect(result).toEqual({
      success: true,
      message: 'Invite email sent successfully',
    });
  });

  it('acceptUsersInvite should throw when token is missing', async () => {
    await expect(
      service.acceptUsersInvite(undefined, { _id: 'u1' } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('acceptUsersInvite should throw when user is missing', async () => {
    await expect(
      service.acceptUsersInvite('token', undefined),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('acceptUsersInvite should throw when invited email does not match user email', async () => {
    configService.get.mockReturnValue('invite-secret');
    jwtService.verify.mockReturnValue({
      email: 'invited@example.com',
      projectId: 'project-1',
    });

    await expect(
      service.acceptUsersInvite('token', {
        _id: 'user-1',
        email: 'other@example.com',
      } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('acceptUsersInvite should add user to project and return success', async () => {
    configService.get.mockReturnValue('invite-secret');
    jwtService.verify.mockReturnValue({
      email: 'member@example.com',
      projectId: 'project-1',
    });
    projectModel.updateOne.mockResolvedValue({ matchedCount: 1 });

    const result = await service.acceptUsersInvite('token', {
      _id: 'user-1',
      email: 'member@example.com',
    } as never);

    expect(projectModel.updateOne).toHaveBeenCalledWith(
      {
        _id: 'project-1',
        'members.user': { $ne: 'user-1' },
      },
      {
        $push: {
          members: {
            user: 'user-1',
            role: ProjectRole.MEMBER,
          },
        },
      },
    );
    expect(result).toEqual({
      success: true,
      message: 'Invite accepted and user added to the project',
    });
  });

  it('acceptUsersInvite should throw when project no longer exists', async () => {
    configService.get.mockReturnValue('invite-secret');
    jwtService.verify.mockReturnValue({
      email: 'member@example.com',
      projectId: 'project-404',
    });
    projectModel.updateOne.mockResolvedValue({ matchedCount: 0 });
    projectModel.exists.mockResolvedValue(null);

    await expect(
      service.acceptUsersInvite('token', {
        _id: 'user-1',
        email: 'member@example.com',
      } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('inviteUsers should throw when invite secret is missing', async () => {
    projectModel.findById.mockResolvedValue({
      _id: 'project-1',
      name: 'Alpha',
    });
    userModel.findOne.mockResolvedValue(null);
    configService.get.mockReturnValue(undefined);

    await expect(
      service.inviteUsers(
        'project-1',
        { email: 'member@example.com' } as never,
        'user-1',
      ),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});

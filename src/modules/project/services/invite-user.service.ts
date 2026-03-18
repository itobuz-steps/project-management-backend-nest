import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { AppConfig } from 'src/config/app.config';
import { MailService } from 'src/mail/mail.service';
import type { UserDocument } from '../../auth/schemas/user.schema';
import { User } from '../../auth/schemas/user.schema';
import { InviteUserDto } from './../dto/invite-user.dto';
import { Project } from './../schema/project.schema';
import { ProjectRole, InvitePayload } from './../type/project.types';
import { ObjectIdLike } from 'src/type/common.type';

@Injectable()
export class InviteUserService {
  constructor(
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfig>,
  ) {}

  async inviteUsers(projectId: string, dto: InviteUserDto, id?: ObjectIdLike) {
    const { email } = dto;

    const project = await this.projectModel.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const user = await this.userModel.findOne({ email });
    if (user) {
      const userAlreadyInProject = await this.projectModel.findOne({
        _id: project._id,
        'members.user': user._id,
      });

      if (userAlreadyInProject) {
        throw new BadRequestException('User already exists in this project');
      }
    }

    const inviteSecret = this.configService.get<string>(
      'INVITE_USER_TOKEN_KEY',
    );
    if (!inviteSecret) {
      throw new InternalServerErrorException(
        'Invite token secret is not configured',
      );
    }

    const expiration = this.configService.get<
      AppConfig['INVITE_USER_TOKEN_EXPIRATION_TIME']
    >('INVITE_USER_TOKEN_EXPIRATION_TIME');

    const token = this.jwtService.sign(
      { email, projectId },
      {
        secret: inviteSecret,
        expiresIn: expiration,
      },
    );

    const inviter = await this.userModel.findById(id);

    await this.mailService.sendInvitationMail(
      email,
      token,
      project.name,
      inviter?.name || 'Someone',
    );

    return {
      success: true,
      message: 'Invite email sent successfully',
    };
  }

  async acceptUsersInvite(token: string | undefined, user?: UserDocument) {
    if (!token) {
      throw new BadRequestException('No token provided');
    }

    if (!user) {
      throw new UnauthorizedException(
        'User must be authenticated to accept invite',
      );
    }

    const inviteSecret = this.configService.get<string>(
      'INVITE_USER_TOKEN_KEY',
    );
    if (!inviteSecret) {
      throw new InternalServerErrorException(
        'Invite token secret is not configured',
      );
    }

    let decodedInvite: InvitePayload;
    try {
      decodedInvite = this.jwtService.verify<InvitePayload>(token, {
        secret: inviteSecret,
      });
    } catch {
      throw new BadRequestException('Invalid or expired invite token');
    }

    const { email: inviteEmail, projectId } = decodedInvite;

    if (user.email !== inviteEmail) {
      throw new ForbiddenException(
        'You must log in using the invited email address',
      );
    }

    const project = await this.projectModel.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const memberExists = project.members.some(
      (member) => String(member.user) === String(user._id),
    );

    if (!memberExists) {
      project.members.push({
        user: user._id,
        role: ProjectRole.MEMBER,
      });
      await project.save();
    }

    return {
      success: true,
      message: 'Invite accepted and user added to the project',
    };
  }
}

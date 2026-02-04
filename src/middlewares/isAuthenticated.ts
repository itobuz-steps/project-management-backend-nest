import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { AuthService } from '../modules/auth/auth.service';
import type { AppConfig } from '../config/app.config';
import type JwtPayload from '../modules/auth/types/auth.types';

@Injectable()
export class IsAuthenticated implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService<AppConfig>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new BadRequestException('Invalid Authorization Header');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new BadRequestException('Invalid Authorization Header');
    }

    const isRefreshTokenRoute = req.originalUrl === '/auth/refresh-token';
    const accessKey = this.configService.get<string>('JWT_ACCESS_KEY');
    const refreshKey = this.configService.get<string>('JWT_REFRESH_KEY');
    const secretKey = isRefreshTokenRoute
      ? (refreshKey ?? 'secret refresh key')
      : (accessKey ?? 'secret access key');

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token, {
        secret: secretKey,
      });
    } catch {
      throw new UnauthorizedException('Invalid Token');
    }

    const user = await this.authService.getUserById(payload.userId);
    if (!user) {
      throw new UnauthorizedException('Invalid Token');
    }

    (req as Request & { user?: typeof user }).user = user;
    return true;
  }
}

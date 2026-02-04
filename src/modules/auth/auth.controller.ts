import {
  Body,
  Controller,
  Post,
  BadRequestException,
  ConflictException,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { MailService } from '../../utils/sendVerificationMail';
import { UserDocument } from './schemas/user.schema';
import { LoginDto } from './dto/login.dto';
import { TokenGeneratorService } from 'src/utils/tokenGenerator';
import type { AppConfig } from 'src/config/app.config';
import { SendOtpDto } from './dto/send-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { IsAuthenticated } from '../../middlewares/isAuthenticated';

type AuthenticatedRequest = Request & { user?: UserDocument };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mailService: MailService,
    private readonly tokenGeneratorService: TokenGeneratorService,
    private readonly configService: ConfigService<AppConfig>,
  ) {}
  @Post('signup')
  async signup(@Body() signupDto: SignupDto) {
    try {
      const { name, email, password } = signupDto;

      const hashedPassword = await bcrypt.hash(password, 10);

      let user: UserDocument;

      try {
        user = await this.authService.getUserByEmail(email);

        if (user.verified) {
          throw new ConflictException(
            'User with the given email already exists',
          );
        }

        await this.authService.updatePassword(email, hashedPassword);
      } catch (err) {
        if (err instanceof ConflictException) {
          throw err;
        }
        user = await this.authService.createUser(name, email, hashedPassword);
      }

      const otp = await this.authService.generateOtp(user._id);

      await this.mailService.sendVerificationMail(email, otp);

      return {
        success: true,
        message: 'User successfully registered',
      };
    } catch (err) {
      if (err instanceof Error) {
        throw new BadRequestException(err?.message ?? 'Signup failed');
      }
    }
  }

  @Post('verify')
  async verify(@Body() verifyOtpDto: VerifyOtpDto) {
    try {
      const { email, otp } = verifyOtpDto;

      await this.authService.verifyUser(email, otp);

      return {
        success: true,
        message: 'User verified successfully',
      };
    } catch (err) {
      if (err instanceof Error) {
        throw new BadRequestException(err?.message ?? 'Verification failed');
      }
    }
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    try {
      const { email, password } = loginDto;

      const user = await this.authService.getUserByEmail(email);

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw new BadRequestException('Invalid credentials');
      }

      if (!user.verified) {
        throw new BadRequestException('User is not verified');
      }

      return {
        success: true,
        message: 'Login successful',
        accessToken: this.tokenGeneratorService.generateToken(
          user._id.toString(), // Convert ObjectId to string
          user.email,
          this.configService.get<string>('JWT_ACCESS_KEY') ??
            'secret access key',
          this.configService.get<AppConfig['JWT_ACCESS_EXPIRATION']>(
            'JWT_ACCESS_EXPIRATION',
          ),
        ),
        refreshToken: this.tokenGeneratorService.generateToken(
          user._id.toString(), // Convert ObjectId to string
          user.email,
          this.configService.get<string>('JWT_REFRESH_KEY') ??
            'secret refresh key',
          this.configService.get<AppConfig['JWT_REFRESH_EXPIRATION']>(
            'JWT_REFRESH_EXPIRATION',
          ),
        ),
      };
    } catch (err) {
      if (err instanceof Error) {
        throw new BadRequestException(err?.message ?? 'Login failed');
      }
    }
  }

  @Post('send-otp')
  async sendOtp(@Body() sendOtpDto: SendOtpDto) {
    try {
      const { email } = sendOtpDto ?? {};

      if (!email) {
        throw new BadRequestException('Email is required');
      }

      const user = await this.authService.getUserByEmail(email);

      if (!user.verified) {
        throw new BadRequestException('User is not verified');
      }

      const otp = await this.authService.generateOtp(user._id);

      await this.mailService.sendVerificationMail(email, otp);

      return {
        success: true,
        message: 'OTP sent successfully',
      };
    } catch (err) {
      if (err instanceof Error) {
        throw new BadRequestException(err?.message ?? 'Sending OTP failed');
      }
    }
  }

  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    try {
      const { email, otp, password } = resetPasswordDto ?? {};

      if (!password || !otp || !email) {
        throw new BadRequestException('Email, OTP and password are required');
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await this.authService.resetPassword(email, otp, hashedPassword);

      return {
        success: true,
        message: 'Password reset successful',
      };
    } catch (err) {
      if (err instanceof Error) {
        throw new BadRequestException(err?.message ?? 'Password reset failed');
      }
    }
  }

  @Post('refresh-token')
  @UseGuards(IsAuthenticated)
  refreshToken(@Req() req: AuthenticatedRequest) {
    try {
      const user = req.user;

      if (!user) {
        throw new UnauthorizedException('Unauthorized');
      }

      const newAccessToken = this.tokenGeneratorService.generateToken(
        user._id.toString(),
        user.email,
        this.configService.get<string>('JWT_ACCESS_KEY') ?? 'secret access key',
        this.configService.get<AppConfig['JWT_ACCESS_EXPIRATION']>(
          'JWT_ACCESS_EXPIRATION',
        ),
      );

      const newRefreshToken = this.tokenGeneratorService.generateToken(
        user._id.toString(),
        user.email,
        this.configService.get<string>('JWT_REFRESH_KEY') ??
          'secret refresh key',
        this.configService.get<AppConfig['JWT_REFRESH_EXPIRATION']>(
          'JWT_REFRESH_EXPIRATION',
        ),
      );

      return {
        success: true,
        message: 'Tokens refreshed',
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (err) {
      if (err instanceof Error) {
        throw new BadRequestException(err?.message ?? 'Token refresh failed');
      }
    }
  }
}

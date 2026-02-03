import {
  Body,
  Controller,
  Post,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { MailService } from '../../utils/sendVerificationMail';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mailService: MailService,
  ) {}
  @Post('signup')
  async signup(@Body() signupDto: SignupDto) {
    try {
      const { name, email, password } = signupDto;

      const hashedPassword = await bcrypt.hash(password, 10);

      let user;

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
      throw new BadRequestException(err?.message ?? 'Signup failed');
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
      throw new BadRequestException(err?.message ?? 'Verification failed');
    }
  }
}

import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @IsString({ message: 'OTP must be a string' })
  @Length(4, 8, { message: 'OTP must be between 4 and 8 characters' })
  otp: string;
}

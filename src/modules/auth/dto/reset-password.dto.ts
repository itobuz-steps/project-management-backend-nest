import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @IsString({ message: 'OTP must be a string' })
  otp: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/(?=.*\d)/, { message: 'Password must contain at least one number' })
  @Matches(/(?=.*[A-Z])/, {
    message: 'Password must contain at least one uppercase letter',
  })
  @Matches(/(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/, {
    message: 'Password must contain at least one special character',
  })
  password: string;
}

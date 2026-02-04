import { IsEmail, IsString, MinLength } from 'class-validator';

export class SignupDto {
  @IsString({ message: 'Name must be a string' })
  @MinLength(1, { message: 'Name is required' })
  name: string;

  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;
}

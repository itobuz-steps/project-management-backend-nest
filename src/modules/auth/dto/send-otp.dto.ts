import { IsEmail } from 'class-validator';

export class SendOtpDto {
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailSender } from './mailSender';
import { AppConfig } from '../config/app.config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService<AppConfig>) {}

  async sendVerificationMail(
    email: string,
    otpValue: string | number,
  ): Promise<void> {
    try {
      const mailSender = new MailSender(this.configService);
      await mailSender.sendMail(
        email,
        'Verification Email',
        `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #f9f9f9;">
  <h2 style="color: #333; text-align: center;">Verification Code</h2>
  <p style="font-size: 16px; color: #555;">Hello,</p>
  <p style="font-size: 16px; color: #555;">
    You requested a verification code. Please use the following OTP to complete your action:
  </p>
  <p style="font-size: 24px; font-weight: bold; text-align: center; color: #1a73e8; margin: 20px 0;">
    ${otpValue}
  </p>
  <p style="font-size: 14px; color: #777;">
    This OTP is valid for a limited time only. Do not share it with anyone.
  </p>
  <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
  <p style="font-size: 12px; color: #999; text-align: center;">
    If you did not request this code, please ignore this email.
  </p>
</div>
        `,
      );

      this.logger.log(`Verification email sent to ${email}`);
      return;
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error);
      throw error;
    }
  }

  async sendInvitationMail(email: string, token: string): Promise<void> {
    try {
      const mailSender = new MailSender(this.configService);
      await mailSender.sendMail(
        email,
        'You are invited to be a part of this project',
        `Click to join this project : http://localhost:5173/invite/join?token=${token}`,
      );

      this.logger.log(`Invitation email sent to ${email}`);
      return;
    } catch (error) {
      this.logger.error(`Failed to send invitation email to ${email}`, error);
      throw error;
    }
  }

  async sendTaskOverdueMail(
    email: string,
    taskTitle: string,
    projectName: string,
  ): Promise<void> {
    try {
      const mailSender = new MailSender(this.configService);
      await mailSender.sendMail(
        email,
        `Task Overdue - ${projectName}`,
        `
        <h3>Task Overdue</h3>
        <p>Your task <b>${taskTitle}</b> in project <b>${projectName}</b> is overdue.</p>
        <p>Please take action.</p>
        `,
      );
      return;
    } catch (error) {
      this.logger.error(`Failed to send task overdue email to ${email}`, error);
      throw error;
    }
  }
}

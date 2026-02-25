import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailSender } from './mailSender';
import { AppConfig } from '../config/app.config';
import { NotificationEmailTemplate } from './utils.types';

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

  async sendNotificationMail(
    email: string,
    subject: string,
    payload: NotificationEmailTemplate,
  ): Promise<void> {
    try {
      const mailSender = new MailSender(this.configService);

      const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #f9f9f9;">
        
        <h2 style="color: #333;">${payload.title}</h2>

        ${
          payload.projectName
            ? `<p style="font-size: 14px; color: #777;">
                 Project: <strong>${payload.projectName}</strong>
               </p>`
            : ''
        }

        <div style="margin: 15px 0; padding: 12px; background: #ffffff; border-left: 4px solid #1a73e8;">
          <h3 style="margin: 0; color: #070707;">${payload.message}</h3>
        </div>

        ${
          payload.highlightText
            ? `
              <div style="
                margin: 0 0 20px 0;
                padding: 18px;
                background: linear-gradient(135deg, #fff8e1, #ffffff);
                border: 2px solid #1a73e8;
                border-radius: 12px;
                box-shadow: 0 6px 18px rgba(0, 145, 255, 0.25);
              ">
                <p style="
                  margin: 0;
                  color: #5c4300;
                  font-size: 16px;
                  font-style: italic;
                  font-weight: 500;
                  line-height: 1.7;
                ">
                  "${payload.highlightText}"
                </p>
              </div>
            `
            : ''
        }

        <p style="font-size: 14px; color: #777;">
          Login to your account to view more details.
        </p>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />

        <p style="font-size: 12px; color: #999; text-align: center;">
          You received this email because email notifications are enabled.
        </p>

      </div>
    `;

      await mailSender.sendMail(email, subject, html);

      this.logger.log(`Notification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send notification email to ${email}`, error);
    }
  }
}

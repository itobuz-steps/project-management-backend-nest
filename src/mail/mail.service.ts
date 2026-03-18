import { Injectable, Logger } from '@nestjs/common';
import { MailSender } from './mailSender';
import { TemplateService } from './template.service';
import { NotificationEmailTemplate } from './mail.types';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailSender: MailSender) {}

  // ✅ VERIFICATION
  async sendVerificationMail(
    email: string,
    otpValue: string | number,
  ): Promise<void> {
    try {
      const html = TemplateService.compile('verification', {
        otp: otpValue,
      });

      await this.mailSender.sendMail(email, 'Verification Email', html);

      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email`, error);
      throw error;
    }
  }

  // ✅ INVITATION
  async sendInvitationMail(email: string, token: string): Promise<void> {
    try {
      const html = TemplateService.compile('invitation', {
        inviteLink: `http://localhost:5173/invite/join?token=${token}`,
      });

      await this.mailSender.sendMail(email, 'Project Invitation', html);

      this.logger.log(`Invitation email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send invitation email`, error);
      throw error;
    }
  }

  // ✅ OVERDUE
  async sendTaskOverdueMail(
    email: string,
    taskTitle: string,
    projectName: string,
  ): Promise<void> {
    try {
      const html = TemplateService.compile('overdue', {
        taskTitle,
        projectName,
      });

      await this.mailSender.sendMail(
        email,
        `Task Overdue - ${projectName}`,
        html,
      );

      this.logger.log(`Overdue email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send overdue email`, error);
      throw error;
    }
  }

  // ✅ NOTIFICATION
  async sendNotificationMail(
    email: string,
    subject: string,
    payload: NotificationEmailTemplate,
  ): Promise<void> {
    try {
      const html = TemplateService.compile('notification', payload);

      await this.mailSender.sendMail(email, subject, html);

      this.logger.log(`Notification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send notification email`, error);
    }
  }
}

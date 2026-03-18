import { Injectable, Logger } from '@nestjs/common';
import { MailSender } from './mailSender';
import { TemplateService } from './template.service';
import { AppConfig } from 'src/config/app.config';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailSender: MailSender,
    private readonly configService: ConfigService<AppConfig>,
  ) {}

  private buildTaskUrl(taskId: string) {
    const baseUrl = this.configService.get<string>('FRONTEND_URL');

    if (!baseUrl) {
      throw new Error('FRONTEND_URL is not defined');
    }

    return `${baseUrl}/task/${taskId}`;
  }

  async sendVerificationMail(
    email: string,
    otpValue: string | number,
  ): Promise<void> {
    try {
      const html = TemplateService.compile('verification', {
        otp: otpValue,
      });

      await this.mailSender.sendMail(email, 'Your Verification Code', html);

      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email`, error);
      throw error;
    }
  }

  async sendInvitationMail(
    email: string,
    token: string,
    projectName: string,
    inviterName?: string,
  ): Promise<void> {
    try {
      const html = TemplateService.compile('invitation', {
        inviteLink: this.buildTaskUrl(token),
        projectName,
        inviterName,
      });

      await this.mailSender.sendMail(
        email,
        `🎉 You're invited to join ${projectName}`,
        html,
      );

      this.logger.log(`Invitation email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send invitation email`, error);
      throw error;
    }
  }

  async sendTaskOverdueMail(
    email: string,
    taskTitle: string,
    projectName: string,
    taskId: string,
  ): Promise<void> {
    try {
      const html = TemplateService.compile('overdue', {
        taskTitle,
        projectName,
        taskUrl: this.buildTaskUrl(taskId),
      });

      await this.mailSender.sendMail(
        email,
        `Task Overdue - ${taskTitle}`,
        html,
      );

      this.logger.log(`Overdue email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send overdue email`, error);
      throw error;
    }
  }

  async sendTemplateMail(
    email: string,
    subject: string,
    template: string,
    payload: unknown,
  ) {
    const html = TemplateService.compile(template, payload);
    await this.mailSender.sendMail(email, subject, html);
  }
}

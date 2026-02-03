import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SentMessageInfo, Transporter } from 'nodemailer';
import { AppConfig } from '../config/app.config';

@Injectable()
export class MailSender {
  private transporter: Transporter;
  private readonly logger = new Logger(MailSender.name);

  constructor(private readonly configService: ConfigService<AppConfig>) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('MAIL_SENDER'),
        pass: this.configService.get<string>('APP_PASSWORD'),
      },
    });
  }

  async sendMail(
    email: string,
    subject: string,
    html: string,
  ): Promise<SentMessageInfo> {
    try {
      const info = await this.transporter.sendMail({
        from: this.configService.get<string>('MAIL_SENDER'),
        to: email,
        subject,
        html,
      });

      this.logger.log(`Mail sent to ${email}`);
      return info;
    } catch (error) {
      this.logger.error(`Mail sending failed to ${email}`, error);
      throw error;
    }
  }
}

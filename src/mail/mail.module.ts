import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailSender } from './mailSender';

@Module({
  providers: [MailService, MailSender],
  exports: [MailService],
})
export class MailModule {}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import webPush, { PushSubscription } from 'web-push';
import { ConfigService } from '@nestjs/config';
import { WebPushPayload } from '../type/notification.type';

@Injectable()
export class WebPushService implements OnModuleInit {
  private readonly logger = new Logger(WebPushService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    webPush.setVapidDetails(
      'mailto:shaswata@itobuz.com',
      this.configService.get<string>('PUBLIC_KEY')!,
      this.configService.get<string>('PRIVATE_KEY')!,
    );
  }

  async sendNotification(
    subscription: PushSubscription,
    payload: WebPushPayload,
  ): Promise<void> {
    try {
      await webPush.sendNotification(subscription, JSON.stringify(payload));
    } catch (error) {
      this.logger.error('Web push error', error);
    }
  }
}

import { IsEmail, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SubscriptionKeysDto {
  @IsString()
  p256dh: string;

  @IsString()
  auth: string;
}

export class SubscriptionDto {
  @IsString()
  endpoint: string;

  @ValidateNested()
  @Type(() => SubscriptionKeysDto)
  keys: SubscriptionKeysDto;
}

export class CreateSubscriptionDto {
  @IsEmail()
  email: string;

  @ValidateNested()
  @Type(() => SubscriptionDto)
  subscription: SubscriptionDto;
}

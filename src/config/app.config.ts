import { registerAs } from '@nestjs/config';
import type { StringValue } from 'ms';

export interface AppConfig {
  PORT: number;
  MONGO_URI: string;
  MONGO_DB_NAME: string;
  JWT_ACCESS_KEY: string;
  JWT_ACCESS_EXPIRATION: StringValue;
  JWT_REFRESH_KEY: string;
  JWT_REFRESH_EXPIRATION: StringValue;
  INVITE_USER_TOKEN_EXPIRATION_TIME: StringValue;
  INVITE_USER_TOKEN_KEY: string;
  MAIL_SENDER: string;
  APP_PASSWORD: string;
  OTP_EXPIRATION: number;
  PUBLIC_KEY?: string;
  PRIVATE_KEY?: string;
  S3_ACCESS_KEY: string;
  S3_SECRET_ACCESS_KEY: string;
  S3_REGION: string;
  S3_BUCKET_NAME: string;
  FRONTEND_URL: string;
}

export default registerAs('app', (): AppConfig => {
  if (!process.env.MONGO_URI) {
    throw new Error('Mongo db connection string is not provided.');
  }
  if (!process.env.MAIL_SENDER) {
    throw new Error('Sender mail id is not provided');
  }
  if (!process.env.APP_PASSWORD) {
    throw new Error('App password is not provided');
  }
  if (!process.env.INVITE_USER_TOKEN_KEY) {
    throw new Error('Invite user token key is not provided');
  }
  if (!process.env.S3_ACCESS_KEY) {
    throw new Error('S3 access key is not provided');
  }
  if (!process.env.S3_SECRET_ACCESS_KEY) {
    throw new Error('S3 secret access key is not provided');
  }
  if (!process.env.S3_REGION) {
    throw new Error('S3 region is not provided');
  }
  if (!process.env.S3_BUCKET_NAME) {
    throw new Error('S3 bucket name is not provided');
  }
  if (!process.env.FRONTEND_URL) {
    throw new Error('Frontend URL is not provided');
  }

  return {
    PORT: Number(process.env.PORT) || 3001,
    MONGO_URI: process.env.MONGO_URI,
    MONGO_DB_NAME: process.env.MONGO_DB_NAME || 'nest-db',
    JWT_ACCESS_KEY: process.env.JWT_SECRET_ACCESS_KEY || 'secret access key',
    JWT_ACCESS_EXPIRATION:
      (process.env.JWT_SECRET_ACCESS_EXPIRATION as StringValue) || '5m',
    JWT_REFRESH_KEY: process.env.JWT_SECRET_REFRESH_KEY || 'secret refresh key',
    JWT_REFRESH_EXPIRATION:
      (process.env.JWT_SECRET_REFRESH_EXPIRATION as StringValue) || '30d',
    INVITE_USER_TOKEN_EXPIRATION_TIME:
      (process.env.INVITE_USER_TOKEN_EXPIRATION_TIME as StringValue) || '1d',
    INVITE_USER_TOKEN_KEY: process.env.INVITE_USER_TOKEN_KEY,
    MAIL_SENDER: process.env.MAIL_SENDER,
    APP_PASSWORD: process.env.APP_PASSWORD,
    OTP_EXPIRATION: Number(process.env.OTP_EXPIRATION) || 5,
    PUBLIC_KEY: process.env.PUBLIC_KEY,
    PRIVATE_KEY: process.env.PRIVATE_KEY,
    S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
    S3_REGION: process.env.S3_REGION,
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
    FRONTEND_URL: process.env.FRONTEND_URL,
  };
});

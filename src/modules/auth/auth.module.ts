import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User, UserSchema } from './schemas/user.schema';
import { Otp, OtpSchema } from './schemas/otp.schema';
import { TokenGeneratorService } from '../../utils/tokenGenerator';
import { IsAuthenticated } from '../../middlewares/isAuthenticated';
import { StorageModule } from 'src/storage/storage.module';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Otp.name, schema: OtpSchema },
    ]),
    JwtModule.register({}),
    StorageModule,
    MailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenGeneratorService, IsAuthenticated],
  exports: [AuthService, IsAuthenticated],
})
export class AuthModule {}

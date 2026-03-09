import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User, UserSchema } from './schemas/user.schema';
import { Otp, OtpSchema } from './schemas/otp.schema';
import { MailService } from '../../utils/sendVerificationMail';
import { TokenGeneratorService } from '../../utils/tokenGenerator';
import { IsAuthenticated } from '../../middlewares/isAuthenticated';
import { StorageModule } from 'src/storage/storage.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Otp.name, schema: OtpSchema },
    ]),
    JwtModule.register({}),
    StorageModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, MailService, TokenGeneratorService, IsAuthenticated],
  exports: [AuthService, IsAuthenticated, MailService],
})
export class AuthModule {}

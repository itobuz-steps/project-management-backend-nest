import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as otpGenerator from 'otp-generator';

import { User, UserDocument } from './schemas/user.schema';
import { Otp, OtpDocument } from './schemas/otp.schema';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/app.config';

type ObjectIdLike = string | Types.ObjectId;

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(Otp.name)
    private readonly otpModel: Model<OtpDocument>,

    private readonly configService: ConfigService<AppConfig>,
  ) {}

  async createUser(
    name: string,
    email: string,
    password: string,
  ): Promise<UserDocument> {
    return this.userModel.create({ name, email, password });
  }

  async getUserById(userId: ObjectIdLike): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getUserByEmail(email: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ email });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async isVerified(userId: ObjectIdLike): Promise<boolean> {
    const user = await this.getUserById(userId);
    return user.verified;
  }

  async updatePassword(email: string, newPassword: string): Promise<void> {
    await this.userModel.findOneAndUpdate({ email }, { password: newPassword });
  }

  async verifyUser(email: string, otp: string): Promise<void> {
    await this.verifyOtp(email, otp);

    const user = await this.getUserByEmail(email);
    user.verified = true;

    await user.save();
  }

  async verifyOtp(email: string, otp: string): Promise<void> {
    const user = await this.getUserByEmail(email);

    const actualOtp = await this.otpModel
      .findOne({ userId: user._id })
      .sort({ createdAt: -1 });

    if (
      !actualOtp ||
      Number(otp) !== actualOtp.value ||
      actualOtp.expiry < new Date()
    ) {
      throw new BadRequestException('Invalid OTP');
    }
  }

  async resetPassword(
    email: string,
    otp: string,
    password: string,
  ): Promise<void> {
    await this.verifyOtp(email, otp);
    await this.updatePassword(email, password);
  }

  async generateOtp(userId: ObjectIdLike): Promise<string> {
    const value = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });

    const expiryMinutes = this.configService.get<number>('OTP_EXPIRATION') || 5;

    const otp = await this.otpModel.create({
      userId,
      value,
      expiry: new Date(Date.now() + expiryMinutes * 60 * 1000),
    });

    return otp.value.toString();
  }
}

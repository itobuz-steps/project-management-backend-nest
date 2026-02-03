import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OtpDocument = HydratedDocument<Otp>;

@Schema({ timestamps: true })
export class Otp {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userId: Types.ObjectId;

  @Prop({
    required: true,
  })
  value: number;

  @Prop({
    required: true,
    default: () => new Date(Date.now() + 120 * 1000),
  })
  expiry: Date;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);

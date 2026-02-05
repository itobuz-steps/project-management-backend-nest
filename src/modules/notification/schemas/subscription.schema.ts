import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Subscription extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: 'Project',
  })
  projectId?: Types.ObjectId;

  @Prop({ required: true })
  endpoint: string;

  @Prop({
    type: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    required: true,
  })
  keys: {
    p256dh: string;
    auth: string;
  };
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

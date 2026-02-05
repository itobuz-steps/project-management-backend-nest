import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Notification extends Document {
  //   @Prop({ required: true })
  //   userId: string;
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop()
  taskId?: string;

  @Prop()
  projectId?: string;

  @Prop({ default: 'Notification' })
  title: string;

  @Prop()
  message?: string;

  @Prop({ default: null })
  profileImage?: string | null;

  @Prop({ default: true })
  unread: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

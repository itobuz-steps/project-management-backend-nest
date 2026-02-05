import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Notification extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop()
  taskId?: string;

  @Prop()
  projectId?: Types.ObjectId;

  @Prop({ default: 'Notification' })
  title: string;

  @Prop()
  message?: string;

  @Prop({ type: String, default: null })
  profileImage?: string | null;

  @Prop({ default: true })
  unread: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

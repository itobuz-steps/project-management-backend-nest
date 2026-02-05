import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop()
  taskId?: Types.ObjectId;

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

  createdAt: Date;
  updatedAt: Date;
}

export type NotificationDocument = HydratedDocument<Notification>;
export const NotificationSchema = SchemaFactory.createForClass(Notification);

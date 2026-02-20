import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Comment extends Document {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Task',
    required: true,
  })
  taskId: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  author: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  message: string;

  @Prop({
    type: String,
    default: null,
  })
  attachment: string | null;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }] })
  mentions: Types.ObjectId[];
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

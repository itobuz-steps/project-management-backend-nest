import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Task extends Document {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Project',
    required: true,
  })
  projectId: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  title: string;

  @Prop({
    type: String,
    trim: true,
    default: null,
  })
  description: string | null;

  @Prop({
    type: String,
    enum: ['bug', 'task', 'story'],
    required: true,
  })
  type: 'bug' | 'task' | 'story';

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  key: string;

  @Prop({
    type: String,
    required: true,
  })
  status: string;

  @Prop({
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  })
  priority: 'low' | 'medium' | 'high' | 'critical';

  @Prop({
    type: [String],
    default: [],
  })
  tags: string[];

  @Prop({
    type: Date,
    default: null,
  })
  dueDate: Date | null;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  reporter: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    default: null,
  })
  assignee: Types.ObjectId | null;

  @Prop({
    type: Number,
    default: 0,
  })
  storyPoint: number;

  @Prop([
    {
      type: MongooseSchema.Types.ObjectId,
      ref: 'Task',
    },
  ])
  subTasks: Types.ObjectId[];

  @Prop({
    type: [String],
    default: [],
  })
  attachments: string[];

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Task',
    default: null,
  })
  parentTask: Types.ObjectId | null;
}

export const TaskSchema = SchemaFactory.createForClass(Task);

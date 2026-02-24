import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { TASK_PRIORITIES, TASK_TYPES } from 'src/constants/task.constants';
import type { TaskPriority, TaskType } from 'src/constants/task.constants';

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
    enum: TASK_TYPES,
    required: true,
  })
  type: TaskType;

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
    enum: TASK_PRIORITIES,
    default: 'medium',
  })
  priority: TaskPriority;

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

  @Prop({
    type: Date,
  })
  createdAt?: Date;

  @Prop({
    type: Date,
  })
  updatedAt?: Date;
}

export const TaskSchema = SchemaFactory.createForClass(Task);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ActivityAction } from '../type/activity.types';
import { Task } from '../../tasks/entities/task.entity';
import { Project } from 'src/modules/project/schema/project.schema';

@Schema({ timestamps: true })
export class Activity extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Task', required: false })
  task?: Task;

  @Prop({ type: Types.ObjectId, ref: 'Project' })
  project?: Project;

  @Prop({ type: String })
  projectName?: string;

  @Prop({ type: String, enum: ActivityAction, required: true })
  action?: ActivityAction;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  byUser?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  targetUser?: Types.ObjectId;

  @Prop({ type: Object })
  updatedFields?: Record<string, { from: string; to: string }>;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);

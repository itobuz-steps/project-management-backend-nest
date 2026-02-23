import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Sprint extends Document {
  @Prop({ required: true })
  key: string;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'Task' }],
    default: [],
  })
  tasks: Types.ObjectId[];

  @Prop()
  dueDate?: Date;

  @Prop({ default: false })
  isCompleted: boolean;

  @Prop({ default: 0 })
  storyPoint: number;

  @Prop({
    type: Types.ObjectId,
    ref: 'Project',
    required: true,
  })
  projectId: Types.ObjectId;

  @Prop({
    default: null,
  })
  endDate?: Date;

  createdAt: Date;
  updatedAt: Date;

  @Prop({ type: Map, of: String, default: {} })
  taskStatusesAtCompletion: Map<string, string>;
}

export const SprintSchema = SchemaFactory.createForClass(Sprint);

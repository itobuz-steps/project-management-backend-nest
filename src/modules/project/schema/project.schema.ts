import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  ProjectRole,
  ProjectType,
} from 'src/modules/project/type/project.types';

@Schema({ timestamps: true })
export class Project extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ type: String, default: null })
  icon?: string;

  @Prop()
  iconKey?: string;

  @Prop({ required: true, enum: ProjectType })
  projectType: ProjectType;

  @Prop({
    type: [String],
    default: ['todo', 'in-progress', 'done', 'review'],
  })
  columns: string[];

  @Prop({
    type: [
      {
        user: { type: Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ProjectRole },
      },
    ],
    default: [],
  })
  members: {
    user: Types.ObjectId;
    role: ProjectRole;
  }[];

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  memberLead: Types.ObjectId;

  @Prop()
  prefix?: string;

  @Prop({ default: 0, min: 0 })
  lastKey: number;

  @Prop({ default: 0, min: 0 })
  sprintCount: number;

  @Prop({
    type: Types.ObjectId,
    ref: 'Sprint',
    default: null,
  })
  currentSprint: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  defaultAssignee?: Types.ObjectId;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Role } from '../types/auth.types';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: false })
  verified: boolean;

  @Prop({ type: String, default: null })
  profileImage: string | null;

  @Prop([{ type: Types.ObjectId, ref: 'Project' }])
  projects: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'Subscription', default: null })
  subscription?: Types.ObjectId | null;

  @Prop({ default: true })
  preferences: boolean;

  @Prop({
    enum: Role,
    default: Role.ADMIN,
  })
  role: Role;

  @Prop({
    enum: ['offline', 'online'],
    default: 'offline',
  })
  onlineStatus: 'offline' | 'online';
}

export const UserSchema = SchemaFactory.createForClass(User);

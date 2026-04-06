import { Types } from 'mongoose';

export interface CommentDocument {
  _id: Types.ObjectId;
  taskId: Types.ObjectId;
  author: { name: string; profileImage: string }; // populated shape
  message: string;
  parsedText?: string;
  attachment: string | null;
  mentions: Types.ObjectId[];
  parentId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentWithReplies extends CommentDocument {
  replies: CommentDocument[];
}

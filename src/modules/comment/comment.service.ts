import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Comment } from './entities/comment.entity';
import { Task } from '../tasks/entities/task.entity';
import { Project } from '../project/schema/project.schema';
import { ObjectIdLike } from 'src/type/common.type';

@Injectable()
export class CommentService {
  constructor(
    @InjectModel(Comment.name) private readonly commentModel: Model<Comment>,
    @InjectModel(Task.name) private readonly taskModel: Model<Task>,
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
  ) {}

  async getCommentsByTaskId(
    userId: ObjectIdLike,
    taskId: ObjectIdLike,
  ): Promise<Comment[]> {
    await this.checkMembership(userId, taskId);

    return this.commentModel
      .find({ taskId })
      .populate('author', 'name profileImage');
  }

  async create(
    userId: ObjectIdLike,
    taskId: ObjectIdLike,
    createCommentDto: CreateCommentDto,
  ): Promise<Comment> {
    await this.checkMembership(userId, taskId);

    const newComment = await this.commentModel.create({
      ...createCommentDto,
      taskId,
      author: userId,
    });

    return newComment;
  }

  async update(
    userId: ObjectIdLike,
    commentId: ObjectIdLike,
    updateCommentDto: UpdateCommentDto,
  ): Promise<Comment | null> {
    const comment = await this.commentModel.findById(commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.author.toString() !== userId.toString()) {
      throw new UnauthorizedException(
        'User is not authorized to update this comment',
      );
    }

    return this.commentModel.findByIdAndUpdate(commentId, updateCommentDto, {
      new: true,
    });
  }

  async remove(
    userId: ObjectIdLike,
    commentId: ObjectIdLike,
  ): Promise<Comment | null> {
    const comment = await this.commentModel.findById(commentId);

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.author.toString() !== userId.toString()) {
      throw new UnauthorizedException(
        'User is not authorized to delete this comment',
      );
    }

    return this.commentModel.findByIdAndDelete(commentId);
  }

  async checkMembership(userId: ObjectIdLike, taskId: ObjectIdLike) {
    const task = await this.taskModel.findById(taskId);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const project = await this.projectModel.findOne({
      _id: task.projectId,
      'members.user': userId,
    });

    if (!project) {
      throw new UnauthorizedException(
        'User is not authorized to comment on this task',
      );
    }
  }
}

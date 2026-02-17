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
import { NotificationPushService } from '../notification/services/notification-push.service';
import { Role } from '../auth/types/auth.types';

@Injectable()
export class CommentService {
  constructor(
    @InjectModel(Comment.name) private readonly commentModel: Model<Comment>,
    @InjectModel(Task.name) private readonly taskModel: Model<Task>,
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    private readonly notificationPushService: NotificationPushService,
  ) {}

  async getCommentsByTaskId(
    userId: ObjectIdLike,
    role: Role,
    taskId: ObjectIdLike,
  ): Promise<Comment[]> {
    await this.checkMembership(userId, role, taskId);

    return this.commentModel
      .find({ taskId })
      .populate('author', 'name profileImage');
  }

  async create(
    userId: ObjectIdLike,
    role: Role,
    taskId: ObjectIdLike,
    createCommentDto: CreateCommentDto,
  ): Promise<Comment> {
    const task = await this.checkMembership(userId, role, taskId);

    const newComment = await this.commentModel.create({
      ...createCommentDto,
      taskId,
      author: userId,
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Notify assignee and reporter about new comment (excluding the commenter)
    const usersToNotify = new Set<string>();
    if (task.assignee && task.assignee.toString() !== userId.toString()) {
      usersToNotify.add(task.assignee.toString());
    }
    if (task.reporter.toString() !== userId.toString()) {
      usersToNotify.add(task.reporter.toString());
    }

    Promise.all(
      Array.from(usersToNotify).map((notifyUserId) =>
        this.notificationPushService.pushNotificationToUser(notifyUserId, {
          title: `New Comment on "${task.title}"`,
          message: `A new comment was added to task "${task.title}"`,
          projectId: task.projectId,
          taskId: task._id,
        }),
      ),
    ).catch((err) => {
      console.error('Error sending notifications for new comment:', err);
    });

    return newComment;
  }

  async update(
    userId: ObjectIdLike,
    role: Role,
    commentId: ObjectIdLike,
    updateCommentDto: UpdateCommentDto,
  ): Promise<Comment | null> {
    const comment = await this.commentModel.findById(commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (
      comment.author.toString() !== userId.toString() &&
      role !== Role.SUPERADMIN
    ) {
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
    role: Role,
    commentId: ObjectIdLike,
  ): Promise<Comment | null> {
    const comment = await this.commentModel.findById(commentId);

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (
      comment.author.toString() !== userId.toString() &&
      role !== Role.SUPERADMIN
    ) {
      throw new UnauthorizedException(
        'User is not authorized to delete this comment',
      );
    }

    return this.commentModel.findByIdAndDelete(commentId);
  }

  async checkMembership(
    userId: ObjectIdLike,
    role: Role,
    taskId: ObjectIdLike,
  ) {
    const task = await this.taskModel.findById(taskId);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (role === Role.SUPERADMIN) {
      return task;
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

    return task;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Task } from '../../tasks/entities/task.entity';
import { User } from '../../auth/schemas/user.schema';
import { Project } from '../../project/schema/project.schema';
import { NotificationPushService } from './notification-push.service';
import { MailService } from '../../../utils/sendVerificationMail';

@Injectable()
export class NotificationCronService {
  private readonly logger = new Logger(NotificationCronService.name);

  constructor(
    @InjectModel(Task.name)
    private readonly taskModel: Model<Task>,

    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,

    @InjectModel(User.name)
    private readonly userModel: Model<User>,

    private readonly pushService: NotificationPushService,
    private readonly mailService: MailService,
  ) {}

  // Every 3 days at midnight
  @Cron('0 0 */3 * *')
  async handleOverdueTasks() {
    this.logger.log('Running overdue task cron');

    const now = new Date();

    try {
      const overdueTasks = this.taskModel
        .find({ dueDate: { $lt: now } })
        .cursor();

      for await (const task of overdueTasks) {
        const project = await this.projectModel.findById(task.projectId);
        if (!project) continue;

        const payload = {
          title: `Overdue Reminder for Task ${task.key} of ${project.name}`,
          message: `Task "${task.title}" is overdue`,
          projectId: task.projectId,
          taskId: task._id,
        };

        const assigneeId = task.assignee;
        const reporterId = task.reporter;

        if (
          assigneeId &&
          reporterId &&
          assigneeId.toString() !== reporterId.toString()
        ) {
          await this.pushService.pushNotificationToUser(assigneeId, payload);
          await this.pushService.pushNotificationToUser(reporterId, payload);

          const assignee = assigneeId
            ? await this.userModel.findById(assigneeId)
            : null;

          const reporter = reporterId
            ? await this.userModel.findById(reporterId)
            : null;

          if (assignee?.email) {
            await this.mailService.sendTaskOverdueMail(
              assignee.email,
              task.title,
              project.name,
            );
          }

          if (
            reporter?.email &&
            assigneeId?.toString() !== reporterId?.toString()
          ) {
            await this.mailService.sendTaskOverdueMail(
              reporter.email,
              task.title,
              project.name,
            );
          }
        } else if (reporterId) {
          await this.pushService.pushNotificationToUser(reporterId, payload);
        }
      }
    } catch (error) {
      this.logger.error('Cron error', error);
    }
  }
}

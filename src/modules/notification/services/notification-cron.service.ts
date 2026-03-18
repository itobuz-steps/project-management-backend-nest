import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task } from '../../tasks/entities/task.entity';
import { User } from '../../auth/schemas/user.schema';
import { Project } from '../../project/schema/project.schema';
import { NotificationPushService } from './notification-push.service';
import { MailService } from '../../../mail/mail.service';

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
        if (!project) {
          continue;
        }

        const payload = {
          title: `Overdue Reminder for Task ${task.key} of ${project.name}`,
          message: `Task "${task.title}" is overdue`,
          projectId: task.projectId,
          taskId: task._id,
        };

        const assignee = task.assignee
          ? await this.userModel.findById(task.assignee)
          : null;

        const reporter = task.reporter
          ? await this.userModel.findById(task.reporter)
          : null;

        if (assignee) {
          await this.pushService.pushNotificationToUser(assignee._id, payload);

          if (assignee.notificationPreferences?.email && assignee.email) {
            await this.mailService.sendTaskOverdueMail(
              assignee.email,
              task.title,
              project.name,
            );
          }
        }

        if (reporter && reporter._id.toString() !== assignee?._id.toString()) {
          await this.pushService.pushNotificationToUser(reporter._id, payload);

          if (reporter.notificationPreferences?.email && reporter.email) {
            await this.mailService.sendTaskOverdueMail(
              reporter.email,
              task.title,
              project.name,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error('Cron error', error);
    }
  }
}

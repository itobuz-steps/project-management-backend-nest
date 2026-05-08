/// <reference types="jest" />

jest.mock('../entities/comment.entity', () => ({
  Comment: class Comment {},
}));

jest.mock('src/modules/tasks/entities/task.entity', () => ({
  Task: class Task {},
}));

jest.mock('src/modules/project/schema/project.schema', () => ({
  Project: class Project {},
}));

jest.mock('src/modules/auth/schemas/user.schema', () => ({
  User: class User {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CommentService } from '../comment.service';
import { NotificationPushService } from 'src/modules/notification/services/notification-push.service';
import { ActivityService } from 'src/modules/activity/services/activity.service';
import { StorageService } from 'src/storage/storage.service';
import { MailService } from 'src/mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { Role } from 'src/modules/auth/types/auth.types';

describe('CommentService', () => {
  let service: CommentService;

  const commentModel = {
    find: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  };

  const taskModel = {
    findById: jest.fn(),
  };

  const projectModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
  };

  const userModel = {
    findById: jest.fn(),
  };

  const notificationPushService = {
    pushNotificationToUser: jest.fn(),
  };

  const activityService = {
    logCommentAdded: jest.fn(),
  };

  const storageService = {
    uploadSingleFile: jest.fn(),
  };

  const mailService = {
    sendTemplateMail: jest.fn(),
  };

  const configService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        { provide: getModelToken('Comment'), useValue: commentModel },
        { provide: getModelToken('Task'), useValue: taskModel },
        { provide: getModelToken('Project'), useValue: projectModel },
        { provide: getModelToken('User'), useValue: userModel },
        {
          provide: NotificationPushService,
          useValue: notificationPushService,
        },
        { provide: ActivityService, useValue: activityService },
        { provide: StorageService, useValue: storageService },
        { provide: MailService, useValue: mailService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<CommentService>(CommentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getCommentsByTaskId should return parent comments with mapped replies', async () => {
    jest.spyOn(service, 'checkMembership').mockResolvedValue({
      _id: new Types.ObjectId(),
    } as never);

    const parentId = new Types.ObjectId();
    const replyId = new Types.ObjectId();
    const comments = [
      {
        _id: parentId,
        taskId: new Types.ObjectId(),
        author: { name: 'John', profileImage: 'img' },
        message: 'Parent comment',
        attachment: null,
        mentions: [],
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: replyId,
        taskId: new Types.ObjectId(),
        author: { name: 'Jane', profileImage: 'img' },
        message: 'Reply',
        attachment: null,
        mentions: [],
        parentId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const leanMock = jest.fn().mockResolvedValue(comments);
    const populateMock = jest.fn().mockReturnValue({ lean: leanMock });
    commentModel.find.mockReturnValue({ populate: populateMock });

    const result = await service.getCommentsByTaskId(
      'user-1',
      Role.USER,
      'task-1',
    );

    expect(result).toHaveLength(1);
    expect(result[0]._id).toEqual(parentId);
    expect(result[0].replies).toHaveLength(1);
    expect(result[0].replies[0]._id).toEqual(replyId);
  });

  it('create should throw when task is not found from membership check', async () => {
    jest.spyOn(service, 'checkMembership').mockResolvedValue(null as never);

    await expect(
      service.create('user-1', Role.USER, 'task-1', {
        message: 'New comment',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create should throw when parent comment does not exist', async () => {
    jest.spyOn(service, 'checkMembership').mockResolvedValue({
      _id: new Types.ObjectId(),
      title: 'Task title',
      key: 'PROJ-1',
      projectId: new Types.ObjectId(),
      reporter: new Types.ObjectId(),
      assignee: new Types.ObjectId(),
    } as never);

    commentModel.findById.mockResolvedValue(null);

    await expect(
      service.create('user-1', Role.USER, 'task-1', {
        message: 'Reply',
        parentId: new Types.ObjectId().toString(),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('create should throw when trying to reply to a reply', async () => {
    jest.spyOn(service, 'checkMembership').mockResolvedValue({
      _id: new Types.ObjectId(),
      title: 'Task title',
      key: 'PROJ-1',
      projectId: new Types.ObjectId(),
      reporter: new Types.ObjectId(),
      assignee: new Types.ObjectId(),
    } as never);

    commentModel.findById.mockResolvedValue({
      _id: new Types.ObjectId(),
      parentId: new Types.ObjectId(),
    });

    await expect(
      service.create('user-1', Role.USER, 'task-1', {
        message: 'Reply',
        parentId: new Types.ObjectId().toString(),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('create should persist comment, log activity and notify unique users', async () => {
    const userId = new Types.ObjectId();
    const assigneeId = new Types.ObjectId();
    const reporterId = new Types.ObjectId();
    const mentionedId = new Types.ObjectId();
    const taskId = new Types.ObjectId();

    jest.spyOn(service, 'checkMembership').mockResolvedValue({
      _id: taskId,
      title: 'Implement auth',
      key: 'PRJ-10',
      projectId: new Types.ObjectId(),
      reporter: reporterId,
      assignee: assigneeId,
    } as never);

    storageService.uploadSingleFile.mockResolvedValue({
      url: 'https://cdn/file.png',
    });
    commentModel.create.mockResolvedValue({ _id: new Types.ObjectId() });
    userModel.findById.mockResolvedValue({
      email: 'user@example.com',
      notificationPreferences: { email: false },
    });
    notificationPushService.pushNotificationToUser.mockResolvedValue(undefined);

    await service.create(
      userId,
      Role.USER,
      taskId,
      {
        message:
          '<p>Hello <span data-type="mention" data-label="Jane"></span></p>',
        mentions: [
          assigneeId.toString(),
          mentionedId.toString(),
          userId.toString(),
        ],
      },
      { originalname: 'file.png' } as never,
    );

    expect(storageService.uploadSingleFile).toHaveBeenCalledTimes(1);
    expect(commentModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        attachment: 'https://cdn/file.png',
        taskId,
        author: userId,
        parsedText: 'Hello @Jane',
      }),
    );
    expect(activityService.logCommentAdded).toHaveBeenCalledWith({
      taskId: taskId.toString(),
      byUserId: userId.toString(),
      commentText:
        '<p>Hello <span data-type="mention" data-label="Jane"></span></p>',
    });
    expect(
      notificationPushService.pushNotificationToUser,
    ).toHaveBeenCalledTimes(3);
  });

  it('update should throw when comment is not found', async () => {
    commentModel.findById.mockResolvedValue(null);

    await expect(
      service.update('user-1', Role.USER, 'comment-1', {
        message: 'Updated',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update should throw when user is not comment author', async () => {
    commentModel.findById.mockResolvedValue({
      _id: new Types.ObjectId(),
      taskId: new Types.ObjectId(),
      author: new Types.ObjectId(),
      mentions: [],
      message: 'Original',
    });
    taskModel.findById.mockResolvedValue({
      _id: new Types.ObjectId(),
      projectId: new Types.ObjectId(),
      title: 'Task title',
      key: 'PRJ-1',
    });

    await expect(
      service.update('user-1', Role.USER, 'comment-1', {
        message: 'Updated',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('update should notify only newly added mentions', async () => {
    const commenterId = new Types.ObjectId();
    const alreadyMentioned = new Types.ObjectId();
    const newMention = new Types.ObjectId();
    const taskId = new Types.ObjectId();

    commentModel.findById.mockResolvedValue({
      _id: new Types.ObjectId(),
      taskId,
      author: commenterId,
      mentions: [alreadyMentioned],
      message: 'Original comment',
    });
    taskModel.findById.mockResolvedValue({
      _id: taskId,
      projectId: new Types.ObjectId(),
      title: 'Task title',
      key: 'PRJ-1',
    });
    commentModel.findByIdAndUpdate.mockResolvedValue({ _id: 'comment-1' });
    userModel.findById.mockResolvedValue({
      email: 'user@example.com',
      notificationPreferences: { email: false },
    });
    notificationPushService.pushNotificationToUser.mockResolvedValue(undefined);

    await service.update(commenterId, Role.USER, 'comment-1', {
      message: 'Updated comment',
      mentions: [
        alreadyMentioned.toString(),
        newMention.toString(),
        commenterId.toString(),
      ],
    });

    expect(commentModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'comment-1',
      expect.objectContaining({
        message: 'Updated comment',
        parsedText: 'Updated comment',
      }),
      { new: true },
    );
    expect(
      notificationPushService.pushNotificationToUser,
    ).toHaveBeenCalledTimes(1);
    expect(notificationPushService.pushNotificationToUser).toHaveBeenCalledWith(
      newMention.toString(),
      expect.objectContaining({
        message: 'You were mentioned in an edited comment',
      }),
    );
  });

  it('remove should throw when comment is not found', async () => {
    commentModel.findById.mockResolvedValue(null);

    await expect(
      service.remove('user-1', Role.USER, 'comment-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('remove should throw when user is not authorized', async () => {
    commentModel.findById.mockResolvedValue({
      _id: new Types.ObjectId(),
      author: new Types.ObjectId(),
    });

    await expect(
      service.remove('user-1', Role.USER, 'comment-1'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('remove should delete comment when author matches', async () => {
    const authorId = new Types.ObjectId();
    commentModel.findById.mockResolvedValue({
      _id: new Types.ObjectId(),
      author: authorId,
    });
    commentModel.findByIdAndDelete.mockResolvedValue({ _id: 'comment-1' });

    const result = await service.remove(authorId, Role.USER, 'comment-1');

    expect(commentModel.findByIdAndDelete).toHaveBeenCalledWith('comment-1');
    expect(result).toEqual({ _id: 'comment-1' });
  });

  it('checkMembership should throw when task does not exist', async () => {
    taskModel.findById.mockResolvedValue(null);

    await expect(
      service.checkMembership('user-1', Role.USER, 'task-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('checkMembership should return task directly for superadmin', async () => {
    const task = {
      _id: new Types.ObjectId(),
      projectId: new Types.ObjectId(),
    };
    taskModel.findById.mockResolvedValue(task);

    const result = await service.checkMembership(
      'user-1',
      Role.SUPERADMIN,
      'task-1',
    );

    expect(projectModel.findOne).not.toHaveBeenCalled();
    expect(result).toEqual(task);
  });

  it('checkMembership should throw when project membership is missing', async () => {
    const task = {
      _id: new Types.ObjectId(),
      projectId: new Types.ObjectId(),
    };
    taskModel.findById.mockResolvedValue(task);
    projectModel.findOne.mockResolvedValue(null);

    await expect(
      service.checkMembership('user-1', Role.USER, 'task-1'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('checkMembership should return task when membership exists', async () => {
    const task = {
      _id: new Types.ObjectId(),
      projectId: new Types.ObjectId(),
    };
    taskModel.findById.mockResolvedValue(task);
    projectModel.findOne.mockResolvedValue({ _id: task.projectId });

    const result = await service.checkMembership('user-1', Role.USER, 'task-1');

    expect(projectModel.findOne).toHaveBeenCalledWith({
      _id: task.projectId,
      'members.user': 'user-1',
    });
    expect(result).toEqual(task);
  });
});

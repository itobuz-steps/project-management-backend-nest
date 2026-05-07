/// <reference types="jest" />

jest.mock('src/middlewares/isAuthenticated', () => ({
  IsAuthenticated: class IsAuthenticated {
    canActivate(): boolean {
      return true;
    }
  },
}));

jest.mock('../comment.service', () => ({
  CommentService: class CommentService {
    create = jest.fn();
    getCommentsByTaskId = jest.fn();
    update = jest.fn();
    remove = jest.fn();
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { CommentController } from '../comment.controller';
import { CommentService } from '../comment.service';
import { Role } from 'src/modules/auth/types/auth.types';

describe('CommentController', () => {
  let controller: CommentController;

  const commentService = {
    create: jest.fn(),
    getCommentsByTaskId: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const req = {
    user: {
      _id: 'user-1',
      role: Role.USER,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentController],
      providers: [{ provide: CommentService, useValue: commentService }],
    }).compile();

    controller = module.get<CommentController>(CommentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create should delegate to service and wrap success response', async () => {
    const dto = { message: 'Looks good' };
    const file = { originalname: 'note.png' };

    commentService.create.mockResolvedValue({ _id: 'comment-1' });

    const result = await controller.create(
      req as never,
      'task-1',
      dto as never,
      file as never,
    );

    expect(commentService.create).toHaveBeenCalledWith(
      req.user._id,
      req.user.role,
      'task-1',
      dto,
      file,
    );
    expect(result).toEqual({
      success: true,
      result: { _id: 'comment-1' },
      message: 'Comment created successfully',
    });
  });

  it('getCommentsByTaskId should delegate to service and wrap response', async () => {
    commentService.getCommentsByTaskId.mockResolvedValue([
      { _id: 'comment-1' },
    ]);

    const result = await controller.getCommentsByTaskId(req as never, 'task-1');

    expect(commentService.getCommentsByTaskId).toHaveBeenCalledWith(
      req.user._id,
      req.user.role,
      'task-1',
    );
    expect(result).toEqual({
      success: true,
      result: [{ _id: 'comment-1' }],
    });
  });

  it('update should delegate to service and wrap success response', async () => {
    const dto = { message: 'Updated', mentions: ['user-2'] };
    commentService.update.mockResolvedValue({ _id: 'comment-1' });

    const result = await controller.update(
      'comment-1',
      dto as never,
      req as never,
    );

    expect(commentService.update).toHaveBeenCalledWith(
      req.user._id,
      req.user.role,
      'comment-1',
      dto,
    );
    expect(result).toEqual({
      success: true,
      result: { _id: 'comment-1' },
      message: 'Comment updated successfully',
    });
  });

  it('remove should delegate to service and wrap success response', async () => {
    commentService.remove.mockResolvedValue({ _id: 'comment-1' });

    const result = await controller.remove('comment-1', req as never);

    expect(commentService.remove).toHaveBeenCalledWith(
      req.user._id,
      req.user.role,
      'comment-1',
    );
    expect(result).toEqual({
      success: true,
      result: { _id: 'comment-1' },
      message: 'Comment deleted successfully',
    });
  });
});

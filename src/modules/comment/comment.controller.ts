import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Req,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { IsAuthenticated } from 'src/middlewares/isAuthenticated';
import type { AuthenticatedRequest } from 'src/type/common.type';

@UseGuards(IsAuthenticated)
@ApiTags('comments')
@ApiBearerAuth()
@Controller('tasks/:taskId/comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Param('taskId') taskId: string,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    const result = await this.commentService.create(
      req.user._id,
      taskId,
      createCommentDto,
    );
    return { success: true, result, message: 'Comment created successfully' };
  }

  @Get()
  async getCommentsByTaskId(
    @Req() req: AuthenticatedRequest,
    @Param('taskId') taskId: string,
  ) {
    const result = await this.commentService.getCommentsByTaskId(
      req.user._id,
      taskId,
    );
    return { success: true, result };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.commentService.update(
      req.user._id,
      id,
      updateCommentDto,
    );
    return { success: true, result, message: 'Comment updated successfully' };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const result = await this.commentService.remove(req.user._id, id);
    return { success: true, result, message: 'Comment deleted successfully' };
  }
}

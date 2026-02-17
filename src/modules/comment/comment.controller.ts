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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { IsAuthenticated } from 'src/middlewares/isAuthenticated';
import type { AuthenticatedRequest } from 'src/type/common.type';
import { multerOptionsForSingleFile } from 'src/config/multer.config';

@UseGuards(IsAuthenticated)
@ApiTags('comments')
@ApiBearerAuth()
// @Controller('project/:projectId/tasks/:taskId/comments')
@Controller('tasks/:taskId/comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  @UseInterceptors(FileInterceptor('attachment', multerOptionsForSingleFile))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'The comment message content' },
        attachment: {
          type: 'string',
          format: 'binary',
          description: 'Optional attachment file',
        },
      },
      required: ['message'],
    },
  })
  async create(
    @Req() req: AuthenticatedRequest,
    @Param('taskId') taskId: string,
    @Body() createCommentDto: CreateCommentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      createCommentDto.attachment = file.filename;
    }
    const result = await this.commentService.create(
      req.user._id,
      req.user.role,
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
      req.user.role,
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
      req.user.role,
      id,
      updateCommentDto,
    );
    return { success: true, result, message: 'Comment updated successfully' };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const result = await this.commentService.remove(
      req.user._id,
      req.user.role,
      id,
    );
    return { success: true, result, message: 'Comment deleted successfully' };
  }
}

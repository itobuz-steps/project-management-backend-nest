import { IsString } from 'class-validator';

export class UpdateCommentDto {
  @IsString()
  message: string;
}

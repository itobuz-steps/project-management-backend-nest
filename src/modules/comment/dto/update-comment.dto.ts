import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateCommentDto {
  @ApiProperty({
    description: 'The updated comment message content',
    example: 'Updated comment content here',
  })
  @IsString()
  message: string;
}

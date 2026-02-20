import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateCommentDto {
  @ApiProperty({
    description: 'The updated comment message content',
    example: 'Updated comment content here',
  })
  @IsString()
  message: string;

  @IsOptional()
  mentions?: string[];
}

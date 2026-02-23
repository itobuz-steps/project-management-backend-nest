import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({
    description: 'The comment message content',
    example: 'This task needs more details',
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Optional attachment filename',
    example: 'screenshot.png',
    required: false,
  })
  @IsOptional()
  mentions?: string[];
}

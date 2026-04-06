import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({
    description: 'The comment message content',
    example: 'This task needs more details',
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Mentioned user IDs',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentions?: string[];

  @IsOptional()
  @IsString()
  parentId?: string;
}

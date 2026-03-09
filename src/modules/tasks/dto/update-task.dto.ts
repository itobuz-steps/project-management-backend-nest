import { PartialType, ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { CreateTaskDto } from './create-task.dto';
import { Transform } from 'class-transformer';
import { transformToArray } from 'src/utils/transform.utils';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiProperty({
    description: 'ID of the project this task belongs to',
    example: '507f1f77bcf86cd799439011',
    required: true,
  })
  projectId: string;

  @ApiProperty({
    description:
      'Filenames of existing attachments to keep. Omit this field to keep all existing attachments. Send an empty array to remove all existing attachments.',
    type: [String],
    required: false,
    example: ['attachments-123456-report.pdf'],
  })
  @IsOptional()
  @Transform(transformToArray)
  @IsArray()
  @IsString({ each: true })
  existingAttachments?: string[];
}

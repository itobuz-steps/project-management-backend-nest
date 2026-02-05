import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiProperty({
    description: 'ID of the project this task belongs to',
    example: '507f1f77bcf86cd799439011',
    required: true,
  })
  projectId: string;
}

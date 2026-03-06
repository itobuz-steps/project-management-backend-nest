import { PartialType } from '@nestjs/swagger';
import { CreateWorkspaceDto } from './create-workspace.dto';
import { IsString } from 'class-validator';

export class UpdateWorkspaceDto extends PartialType(CreateWorkspaceDto) {
  @IsString()
  name: string;
}

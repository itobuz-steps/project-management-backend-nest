import { IsMongoId } from 'class-validator';

export class RemoveTaskFromSprintDto {
  @IsMongoId()
  task: string;
}

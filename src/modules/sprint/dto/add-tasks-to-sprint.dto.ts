import { IsArray, IsMongoId } from 'class-validator';

export class AddTasksToSprintDto {
  @IsArray()
  @IsMongoId({ each: true })
  tasks: string[];
}

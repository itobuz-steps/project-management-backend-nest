import {
  IsMongoId,
  IsOptional,
  IsDateString,
  IsArray,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateSprintDto {
  @IsOptional()
  @IsDateString()
  dueDate?: Date;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  tasks?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  storyPoint?: number;
}

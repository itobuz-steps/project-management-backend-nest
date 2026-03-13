import {
  IsOptional,
  IsBoolean,
  IsDateString,
  IsArray,
  IsMongoId,
  IsNumber,
  Min,
} from 'class-validator';

export class UpdateSprintDto {
  @IsOptional()
  @IsDateString()
  dueDate?: Date;

  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @IsOptional()
  @IsBoolean()
  isStarted?: boolean;

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  tasks?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  storyPoint?: number;
}

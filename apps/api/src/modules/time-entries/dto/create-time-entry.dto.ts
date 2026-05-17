import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

export class CreateTimeEntryDto {
  @IsString()
  projectId: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0.01)
  @Max(24)
  hours: number;

  @IsDateString()
  date: string; // YYYY-MM-DD

  @IsOptional()
  @IsBoolean()
  billable?: boolean;
}

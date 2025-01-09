import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

export class DateRangeDto {
  @ApiProperty()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiProperty()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;
}

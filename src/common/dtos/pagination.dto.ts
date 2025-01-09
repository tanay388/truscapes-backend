import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class Pagination {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @ApiProperty({})
  take: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @ApiProperty({})
  skip: number;
}

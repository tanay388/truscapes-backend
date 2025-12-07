import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsNumber, IsDate, Min, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { Type } from 'class-transformer';
import { OrderStatus } from '../entities/order.entity';

export class OrderFilterDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minAmount?: number;

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  maxAmount?: number;

  @ApiPropertyOptional()
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptional()
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  endDate?: Date;

  @ApiPropertyOptional({ description: 'Search term across order/user/product fields' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  q?: string;
}
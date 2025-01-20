import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '../entities/order.entity';

export class UpdateOrderDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @ApiProperty()
  @IsString()
  @IsOptional()
  trackingNumber?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  notes?: string;
}
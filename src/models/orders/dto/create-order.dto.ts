import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { 
  IsArray, 
  IsNotEmpty, 
  IsNumber, 
  IsObject, 
  IsString, 
  ValidateNested 
} from 'class-validator';

class OrderItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsNumber()
  productId: number;

  @ApiProperty({ description: 'Product variant ID', required: false })
  @IsNumber()
  variantId?: number;

  @ApiProperty({ description: 'Quantity of the product' })
  @IsNumber()
  quantity: number;
}

class ShippingAddressDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  zipCode: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ type: ShippingAddressDto })
  @IsObject()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @ApiProperty({ required: false })
  @IsString()
  notes?: string;
}
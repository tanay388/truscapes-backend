import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PaymentGateway } from 'src/models/wallet/dto/repay-dues.dto';

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

class CardInfo {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cardNumber: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  expirationDate: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cvv: string;
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
  @IsOptional()
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

  @ApiPropertyOptional({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ required: false })
  @IsOptional()
  @IsString()
  paymentOrder?: string;

  @ApiPropertyOptional({ type: CardInfo, required: false })
  @IsOptional()
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => CardInfo)
  cardInfo?: CardInfo;

  @ApiProperty({ required: true })
  @IsNotEmpty()
  @IsEnum(PaymentGateway)
  gateway: PaymentGateway;
}

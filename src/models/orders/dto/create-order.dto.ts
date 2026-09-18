import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
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
  @IsOptional()
  variantId?: number;

  @ApiProperty({ description: 'Quantity of the product' })
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional({
    description:
      "True when the customer explicitly ordered by case (applies the product's case discount %).",
  })
  @Transform(({ value }) => value === true || value === 'true' || value === 1)
  @IsBoolean()
  @IsOptional()
  isCaseOrder?: boolean;

  @ApiPropertyOptional({ enum: ['SINGLE', 'CASE'] })
  @IsOptional()
  @IsIn(['SINGLE', 'CASE'])
  quantityType?: 'SINGLE' | 'CASE';
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

  @ApiPropertyOptional({ description: 'Coupon code to apply', required: false })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({
    description: 'Total shown to the customer at checkout (quote integrity)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  expectedTotal?: number;

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

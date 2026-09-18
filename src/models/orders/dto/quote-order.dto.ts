import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
  IsNumber,
  IsObject,
  IsBoolean,
  IsIn,
} from 'class-validator';

class QuoteItemDto {
  @ApiProperty()
  @IsNumber({}, { message: 'Please select a valid product.' })
  productId: number;

  @ApiPropertyOptional()
  @IsNumber({}, { message: 'Please select a valid product option.' })
  @IsOptional()
  variantId?: number;

  @ApiProperty()
  @IsNumber({}, { message: 'Please enter a valid quantity.' })
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

class QuoteShippingAddressDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  city?: string;
}

export class QuoteOrderDto {
  @ApiProperty({ type: [QuoteItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items: QuoteItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({ type: QuoteShippingAddressDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => QuoteShippingAddressDto)
  shippingAddress?: QuoteShippingAddressDto;
}

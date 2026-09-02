import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
  IsNumber,
  IsObject,
  IsBoolean,
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
      'True when the customer explicitly ordered by case (5% case discount). Do not infer from quantity alone.',
  })
  @IsBoolean()
  @IsOptional()
  isCaseOrder?: boolean;
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

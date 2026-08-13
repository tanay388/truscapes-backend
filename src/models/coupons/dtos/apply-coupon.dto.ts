import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ApplyCouponLineDto {
  @IsNumber({}, { message: 'Please select a valid product.' })
  productId: number;

  @IsNumber({}, { message: 'Please select a valid product option.' })
  @IsOptional()
  variantId?: number;

  @IsNumber({}, { message: 'Please enter a valid quantity.' })
  @Min(1, { message: 'Quantity must be at least 1.' })
  quantity: number;

  @IsNumber({}, { message: 'Please enter a valid unit price.' })
  @Min(0, { message: 'Unit price cannot be negative.' })
  @IsOptional()
  unitPriceMills?: number;

  @IsNumber({}, { message: 'Please enter a valid line total.' })
  @Min(0, { message: 'Line total cannot be negative.' })
  @IsOptional()
  lineTotalCents?: number;
}

export class ApplyCouponDto {
  @IsString({ message: 'Please enter a coupon code.' })
  @IsNotEmpty({ message: 'Please enter a coupon code.' })
  couponCode: string;

  @IsNumber({}, { message: 'Please enter a valid order amount.' })
  @Min(0, { message: 'Order amount cannot be negative.' })
  @IsOptional()
  orderAmount?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplyCouponLineDto)
  @IsOptional()
  lines?: ApplyCouponLineDto[];
}

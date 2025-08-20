import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class ApplyCouponDto {
  @IsString()
  @IsNotEmpty()
  couponCode: string;

  @IsNumber()
  @Min(0)
  orderAmount: number;
}
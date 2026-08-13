import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  IsDateString,
  IsArray,
  IsUUID,
  IsBoolean,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  CouponType,
  CouponEligibilityType,
  CouponScopeType,
} from '../entities/coupon.entity';
import { UserRole } from '../../user/entities/user.entity';

export class CreateCouponDto {
  @IsString({ message: 'Please enter a coupon code.' })
  @IsNotEmpty({ message: 'Please enter a coupon code.' })
  code: string;

  @IsString({ message: 'Please enter a coupon name.' })
  @IsNotEmpty({ message: 'Please enter a coupon name.' })
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(CouponType, { message: 'Please choose a valid discount type.' })
  type: CouponType;

  @ValidateIf((o) => o.type !== CouponType.BOGO)
  @IsNumber({}, { message: 'Please enter a valid discount value.' })
  @Min(0, { message: 'Discount value cannot be negative.' })
  @Max(1000000, { message: 'Discount value is too large.' })
  value?: number;

  @IsEnum(CouponEligibilityType, {
    message: 'Please choose who can use this coupon.',
  })
  eligibilityType: CouponEligibilityType;

  @IsArray()
  @IsEnum(UserRole, { each: true })
  @IsOptional()
  @ValidateIf((o) => o.eligibilityType === CouponEligibilityType.USER_ROLE)
  eligibleUserRoles?: UserRole[];

  @IsArray()
  @IsUUID(4, { each: true, message: 'Please select valid users.' })
  @IsOptional()
  @ValidateIf((o) => o.eligibilityType === CouponEligibilityType.SPECIFIC_USERS)
  eligibleUserIds?: string[];

  @IsEnum(CouponScopeType, {
    message: 'Please choose what this coupon applies to.',
  })
  @IsOptional()
  scopeType?: CouponScopeType = CouponScopeType.ENTIRE_ORDER;

  @IsArray()
  @Type(() => Number)
  @IsNumber({}, { each: true, message: 'Please select valid categories.' })
  @IsOptional()
  eligibleCategoryIds?: number[];

  @IsArray()
  @Type(() => Number)
  @IsNumber({}, { each: true, message: 'Please select valid products.' })
  @IsOptional()
  eligibleProductIds?: number[];

  @IsBoolean({ message: 'Please choose whether to include subcategories.' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeSubcategories?: boolean = true;

  @ValidateIf((o) => o.type === CouponType.BOGO)
  @IsNumber(
    {},
    { message: 'Please enter how many items the customer must buy.' },
  )
  @Min(1, { message: 'Buy quantity must be at least 1.' })
  bogoBuyQuantity?: number;

  @ValidateIf((o) => o.type === CouponType.BOGO)
  @IsNumber({}, { message: 'Please enter how many items the customer gets.' })
  @Min(1, { message: 'Get quantity must be at least 1.' })
  bogoGetQuantity?: number;

  @ValidateIf((o) => o.type === CouponType.BOGO)
  @IsNumber({}, { message: 'Please enter a valid get-discount percent.' })
  @Min(0, { message: 'Get discount percent cannot be negative.' })
  @Max(100, { message: 'Get discount percent cannot be more than 100.' })
  @IsOptional()
  bogoGetDiscountPercent?: number = 100;

  @IsNumber({}, { message: 'Please enter a valid max sets per order.' })
  @Min(1, { message: 'Max sets per order must be at least 1.' })
  @IsOptional()
  bogoMaxSetsPerOrder?: number;

  @IsDateString({}, { message: 'Please enter a valid start date.' })
  @IsOptional()
  validFrom?: string;

  @IsDateString({}, { message: 'Please enter a valid end date.' })
  @IsOptional()
  validUntil?: string;

  @IsNumber({}, { message: 'Please enter a valid usage limit.' })
  @IsOptional()
  @Min(1, { message: 'Usage limit must be at least 1.' })
  maxUsage?: number;

  @IsNumber({}, { message: 'Please enter a valid per-user usage limit.' })
  @IsOptional()
  @Min(1, { message: 'Per-user usage limit must be at least 1.' })
  maxUsagePerUser?: number;

  @IsNumber({}, { message: 'Please enter a valid minimum order amount.' })
  @IsOptional()
  @Min(0, { message: 'Minimum order amount cannot be negative.' })
  minimumOrderAmount?: number;

  @IsNumber({}, { message: 'Please enter a valid maximum discount amount.' })
  @IsOptional()
  @Min(0, { message: 'Maximum discount amount cannot be negative.' })
  maximumDiscountAmount?: number;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean = true;
}

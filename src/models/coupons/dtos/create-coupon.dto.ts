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
import { Transform } from 'class-transformer';
import { CouponType, CouponEligibilityType } from '../entities/coupon.entity';
import { UserRole } from '../../user/entities/user.entity';

export class CreateCouponDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(CouponType)
  type: CouponType;

  @IsNumber()
  @Min(0)
  @ValidateIf((o) => o.type === CouponType.PERCENTAGE)
  @Max(100)
  value: number;

  @IsEnum(CouponEligibilityType)
  eligibilityType: CouponEligibilityType;

  @IsArray()
  @IsEnum(UserRole, { each: true })
  @IsOptional()
  @ValidateIf((o) => o.eligibilityType === CouponEligibilityType.USER_ROLE)
  eligibleUserRoles?: UserRole[];

  @IsArray()
  @IsUUID(4, { each: true })
  @IsOptional()
  @ValidateIf((o) => o.eligibilityType === CouponEligibilityType.SPECIFIC_USERS)
  eligibleUserIds?: string[];

  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  maxUsage?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  maxUsagePerUser?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minimumOrderAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  maximumDiscountAmount?: number;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean = true;
}
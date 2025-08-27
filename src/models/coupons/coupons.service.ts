import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Coupon, CouponType, CouponEligibilityType } from './entities/coupon.entity';
import { CouponUsage } from './entities/coupon-usage.entity';
import { User, UserRole } from '../user/entities/user.entity';
import { CreateCouponDto } from './dtos/create-coupon.dto';
import { UpdateCouponDto } from './dtos/update-coupon.dto';
import { ApplyCouponDto } from './dtos/apply-coupon.dto';
import { Pagination } from 'src/common/dtos/pagination.dto';

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon)
    private couponRepository: Repository<Coupon>,
    @InjectRepository(CouponUsage)
    private couponUsageRepository: Repository<CouponUsage>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createCoupon(
    createCouponDto: CreateCouponDto,
    adminId: string,
  ): Promise<Coupon> {
    // Check if coupon code already exists
    const existingCoupon = await this.couponRepository.findOne({
      where: { code: createCouponDto.code },
    });

    if (existingCoupon) {
      throw new ConflictException('Coupon code already exists');
    }

    // Validate eligible users if specified
    let eligibleUsers: User[] = [];
    if (
      createCouponDto.eligibilityType === CouponEligibilityType.SPECIFIC_USERS &&
      createCouponDto.eligibleUserIds
    ) {
      eligibleUsers = await this.userRepository.find({
        where: { id: In(createCouponDto.eligibleUserIds) },
      });

      if (eligibleUsers.length !== createCouponDto.eligibleUserIds.length) {
        throw new BadRequestException('Some specified users do not exist');
      }
    }

    const coupon = this.couponRepository.create({
      ...createCouponDto,
      eligibleUsers,
      createdBy: adminId,
      validFrom: createCouponDto.validFrom
        ? new Date(createCouponDto.validFrom)
        : null,
      validUntil: createCouponDto.validUntil
        ? new Date(createCouponDto.validUntil)
        : null,
    });

    return await this.couponRepository.save(coupon);
  }

  async getAllCoupons(pagination: Pagination): Promise<Coupon[]> {
    return await this.couponRepository.find({
      relations: ['eligibleUsers'],
      order: { createdAt: 'DESC' },
      take: pagination.take,
      skip: pagination.skip
    });
  }

  async getCouponById(id: string): Promise<Coupon> {
    const coupon = await this.couponRepository.findOne({
      where: { id },
      relations: ['eligibleUsers'],
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    return coupon;
  }

  async updateCoupon(
    id: string,
    updateCouponDto: UpdateCouponDto,
  ): Promise<Coupon> {
    const coupon = await this.getCouponById(id);

    // Check if code is being updated and if it conflicts
    if (updateCouponDto.code && updateCouponDto.code !== coupon.code) {
      const existingCoupon = await this.couponRepository.findOne({
        where: { code: updateCouponDto.code },
      });

      if (existingCoupon) {
        throw new ConflictException('Coupon code already exists');
      }
    }

    // Handle eligible users update
    let eligibleUsers: User[] = [];
    if (
      updateCouponDto.eligibilityType === CouponEligibilityType.SPECIFIC_USERS &&
      updateCouponDto.eligibleUserIds
    ) {
      eligibleUsers = await this.userRepository.find({
        where: { id: In(updateCouponDto.eligibleUserIds) },
      });

      if (eligibleUsers.length !== updateCouponDto.eligibleUserIds.length) {
        throw new BadRequestException('Some specified users do not exist');
      }
    }

    Object.assign(coupon, {
      ...updateCouponDto,
      eligibleUsers:
        updateCouponDto.eligibilityType === CouponEligibilityType.SPECIFIC_USERS
          ? eligibleUsers
          : [],
      validFrom: updateCouponDto.validFrom
        ? new Date(updateCouponDto.validFrom)
        : coupon.validFrom,
      validUntil: updateCouponDto.validUntil
        ? new Date(updateCouponDto.validUntil)
        : coupon.validUntil,
    });

    return await this.couponRepository.save(coupon);
  }

  async deleteCoupon(id: string): Promise<void> {
    const unique_string = crypto.randomUUID();
    const coupon = await this.getCouponById(id);
    coupon.code = `${coupon.code}-${unique_string}`;
    coupon.isActive = false;
    await this.couponRepository.save(coupon);
    await this.couponRepository.softDelete(id);
  }

  async getEligibleCouponsForUser(userId: string): Promise<Coupon[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const currentDate = new Date();

    // Get public coupons
    const publicCoupons = await this.couponRepository.find({
      where: {
        eligibilityType: CouponEligibilityType.PUBLIC,
        isActive: true,
      },
    });

    // Get role-based coupons
    const roleCoupons = await this.couponRepository.find({
      where: {
        eligibilityType: CouponEligibilityType.USER_ROLE,
        isActive: true,
      },
    });

    const eligibleRoleCoupons = roleCoupons.filter((coupon) =>
      coupon.eligibleUserRoles?.includes(user.role),
    );

    // Get user-specific coupons
    const userSpecificCoupons = await this.couponRepository
      .createQueryBuilder('coupon')
      .leftJoinAndSelect('coupon.eligibleUsers', 'user')
      .where('coupon.eligibilityType = :type', {
        type: CouponEligibilityType.SPECIFIC_USERS,
      })
      .andWhere('coupon.isActive = :isActive', { isActive: true })
      .andWhere('user.id = :userId', { userId })
      .getMany();

    // Combine all eligible coupons
    const allEligibleCoupons = [
      ...publicCoupons,
      ...eligibleRoleCoupons,
      ...userSpecificCoupons,
    ];

    // Filter by date validity and usage limits
    const validCoupons = [];
    for (const coupon of allEligibleCoupons) {
      // Check date validity
      if (coupon.validFrom && coupon.validFrom > currentDate) continue;
      if (coupon.validUntil && coupon.validUntil < currentDate) continue;

      // Check global usage limit
      if (coupon.maxUsage && coupon.usageCount >= coupon.maxUsage) continue;

      // Check per-user usage limit
      if (coupon.maxUsagePerUser) {
        const userUsageCount = await this.couponUsageRepository.count({
          where: {
            coupon: { id: coupon.id },
            user: { id: userId },
          },
        });

        if (userUsageCount >= coupon.maxUsagePerUser) continue;
      }

      validCoupons.push(coupon);
    }

    return validCoupons;
  }

  async validateAndApplyCoupon(
    applyCouponDto: ApplyCouponDto,
    userId: string,
  ): Promise<{
    isValid: boolean;
    coupon?: Coupon;
    discountAmount?: number;
    message?: string;
  }> {
    const { couponCode, orderAmount } = applyCouponDto;

    // Find the coupon
    const coupon = await this.couponRepository.findOne({
      where: { code: couponCode, isActive: true },
      relations: ['eligibleUsers'],
    });

    if (!coupon) {
      return {
        isValid: false,
        message: 'Invalid or inactive coupon code',
      };
    }

    // Check if user is eligible
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      return {
        isValid: false,
        message: 'User not found',
      };
    }

    const isEligible = await this.isUserEligibleForCoupon(coupon, user);
    if (!isEligible) {
      return {
        isValid: false,
        message: 'You are not eligible for this coupon',
      };
    }

    // Check date validity
    const currentDate = new Date();
    if (coupon.validFrom && coupon.validFrom > currentDate) {
      return {
        isValid: false,
        message: 'Coupon is not yet valid',
      };
    }

    if (coupon.validUntil && coupon.validUntil < currentDate) {
      return {
        isValid: false,
        message: 'Coupon has expired',
      };
    }

    // Check minimum order amount
    if (coupon.minimumOrderAmount && orderAmount < coupon.minimumOrderAmount) {
      return {
        isValid: false,
        message: `Minimum order amount of $${coupon.minimumOrderAmount} required`,
      };
    }

    // Check global usage limit
    if (coupon.maxUsage && coupon.usageCount >= coupon.maxUsage) {
      return {
        isValid: false,
        message: 'Coupon usage limit exceeded',
      };
    }

    // Check per-user usage limit
    if (coupon.maxUsagePerUser) {
      const userUsageCount = await this.couponUsageRepository.count({
        where: {
          coupon: { id: coupon.id },
          user: { id: userId },
        },
      });

      if (userUsageCount >= coupon.maxUsagePerUser) {
        return {
          isValid: false,
          message: 'You have exceeded the usage limit for this coupon',
        };
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.type === CouponType.PERCENTAGE) {
      discountAmount = (orderAmount * coupon.value) / 100;
    } else {
      discountAmount = coupon.value;
    }

    // Apply maximum discount limit
    if (coupon.maximumDiscountAmount && discountAmount > coupon.maximumDiscountAmount) {
      discountAmount = coupon.maximumDiscountAmount;
    }

    // Ensure discount doesn't exceed order amount
    if (discountAmount > orderAmount) {
      discountAmount = orderAmount;
    }

    return {
      isValid: true,
      coupon,
      discountAmount,
      message: 'Coupon applied successfully',
    };
  }

  async recordCouponUsage(
    couponId: string,
    userId: string,
    orderId: string,
    discountAmount: number,
    orderAmount: number,
  ): Promise<CouponUsage> {
    // Get the entities first
    const coupon = await this.couponRepository.findOne({ where: { id: couponId } });
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    // Create usage record
    const usage = this.couponUsageRepository.create({
      coupon,
      user,
      discountAmount,
      orderAmount,
    });

    await this.couponUsageRepository.save(usage);

    // Update coupon usage count
    await this.couponRepository.increment(
      { id: couponId },
      'usageCount',
      1,
    );

    return usage;
  }

  private async isUserEligibleForCoupon(
    coupon: Coupon,
    user: User,
  ): Promise<boolean> {
    switch (coupon.eligibilityType) {
      case CouponEligibilityType.PUBLIC:
        return true;

      case CouponEligibilityType.USER_ROLE:
        return coupon.eligibleUserRoles?.includes(user.role) || false;

      case CouponEligibilityType.SPECIFIC_USERS:
        return coupon.eligibleUsers?.some((u) => u.id === user.id) || false;

      default:
        return false;
    }
  }

  async getCouponUsageStats(couponId: string): Promise<{
    totalUsage: number;
    uniqueUsers: number;
    totalDiscountGiven: number;
  }> {
    const usages = await this.couponUsageRepository.find({
      where: { coupon: { id: couponId } },
    });

    const uniqueUserIds = new Set(usages.map((usage) => usage.user.id));
    const totalDiscountGiven = usages.reduce(
      (sum, usage) => sum + Number(usage.discountAmount),
      0,
    );

    return {
      totalUsage: usages.length,
      uniqueUsers: uniqueUserIds.size,
      totalDiscountGiven,
    };
  }
}
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  Coupon,
  CouponType,
  CouponEligibilityType,
  CouponScopeType,
} from './entities/coupon.entity';
import { CouponUsage } from './entities/coupon-usage.entity';
import { User } from '../user/entities/user.entity';
import { Category } from '../category/entities/category.entity';
import { Product } from '../products/entities/product.entity';
import { CreateCouponDto } from './dtos/create-coupon.dto';
import { UpdateCouponDto } from './dtos/update-coupon.dto';
import { ApplyCouponDto } from './dtos/apply-coupon.dto';
import { Pagination } from 'src/common/dtos/pagination.dto';
import {
  calculateCouponDiscount,
  CouponDiscountResult,
  PricedLine,
} from './coupon-discount.calculator';

export interface CouponValidationResult {
  isValid: boolean;
  coupon?: Coupon;
  discountAmount?: number;
  message?: string;
  lineDiscounts?: CouponDiscountResult['lineDiscounts'];
  eligibleLineCount?: number;
  totalLineCount?: number;
  freeUnits?: number;
  scopeLabel?: string;
}

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

  private couponRelations = [
    'eligibleUsers',
    'eligibleCategories',
    'eligibleProducts',
  ];

  async createCoupon(
    createCouponDto: CreateCouponDto,
    adminId: string,
  ): Promise<Coupon> {
    const existingCoupon = await this.couponRepository.findOne({
      where: { code: createCouponDto.code },
    });

    if (existingCoupon) {
      throw new ConflictException('A coupon with this code already exists.');
    }

    this.assertCouponConfig(createCouponDto);

    const eligibleUsers = await this.loadEligibleUsers(createCouponDto);
    const eligibleCategories = await this.loadEligibleCategories(
      createCouponDto.eligibleCategoryIds,
    );
    const eligibleProducts = await this.loadEligibleProducts(
      createCouponDto.eligibleProductIds,
    );

    const coupon = this.couponRepository.create({
      code: createCouponDto.code,
      name: createCouponDto.name,
      description: createCouponDto.description,
      type: createCouponDto.type,
      value:
        createCouponDto.type === CouponType.BOGO
          ? 0
          : Number(createCouponDto.value ?? 0),
      eligibilityType: createCouponDto.eligibilityType,
      eligibleUserRoles: createCouponDto.eligibleUserRoles,
      eligibleUsers,
      scopeType:
        createCouponDto.scopeType ?? CouponScopeType.ENTIRE_ORDER,
      eligibleCategories,
      eligibleProducts,
      includeSubcategories: createCouponDto.includeSubcategories ?? true,
      bogoBuyQuantity: createCouponDto.bogoBuyQuantity,
      bogoGetQuantity: createCouponDto.bogoGetQuantity,
      bogoGetDiscountPercent: createCouponDto.bogoGetDiscountPercent ?? 100,
      bogoMaxSetsPerOrder: createCouponDto.bogoMaxSetsPerOrder,
      maxUsage: createCouponDto.maxUsage,
      maxUsagePerUser: createCouponDto.maxUsagePerUser,
      minimumOrderAmount: createCouponDto.minimumOrderAmount,
      maximumDiscountAmount: createCouponDto.maximumDiscountAmount,
      isActive: createCouponDto.isActive ?? true,
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
      relations: this.couponRelations,
      order: { createdAt: 'DESC' },
      take: pagination.take,
      skip: pagination.skip,
    });
  }

  async getCouponById(id: string): Promise<Coupon> {
    const coupon = await this.couponRepository.findOne({
      where: { id },
      relations: this.couponRelations,
    });

    if (!coupon) {
      throw new NotFoundException('We could not find this coupon.');
    }

    return coupon;
  }

  async updateCoupon(
    id: string,
    updateCouponDto: UpdateCouponDto,
  ): Promise<Coupon> {
    const coupon = await this.getCouponById(id);

    if (updateCouponDto.code && updateCouponDto.code !== coupon.code) {
      const existingCoupon = await this.couponRepository.findOne({
        where: { code: updateCouponDto.code },
      });

      if (existingCoupon) {
        throw new ConflictException('A coupon with this code already exists.');
      }
    }

    const merged = { ...coupon, ...updateCouponDto } as CreateCouponDto &
      Coupon;
    this.assertCouponConfig(merged);

    let eligibleUsers = coupon.eligibleUsers;
    if (
      updateCouponDto.eligibilityType ===
        CouponEligibilityType.SPECIFIC_USERS ||
      updateCouponDto.eligibleUserIds
    ) {
      eligibleUsers =
        (updateCouponDto.eligibilityType ?? coupon.eligibilityType) ===
        CouponEligibilityType.SPECIFIC_USERS
          ? await this.loadEligibleUsers(updateCouponDto)
          : [];
    }

    let eligibleCategories = coupon.eligibleCategories;
    if (updateCouponDto.eligibleCategoryIds !== undefined) {
      eligibleCategories = await this.loadEligibleCategories(
        updateCouponDto.eligibleCategoryIds,
      );
    }

    let eligibleProducts = coupon.eligibleProducts;
    if (updateCouponDto.eligibleProductIds !== undefined) {
      eligibleProducts = await this.loadEligibleProducts(
        updateCouponDto.eligibleProductIds,
      );
    }

    Object.assign(coupon, {
      ...updateCouponDto,
      eligibleUsers,
      eligibleCategories,
      eligibleProducts,
      value:
        (updateCouponDto.type ?? coupon.type) === CouponType.BOGO
          ? 0
          : updateCouponDto.value !== undefined
            ? Number(updateCouponDto.value)
            : coupon.value,
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
      throw new NotFoundException('We could not find this user.');
    }

    const currentDate = new Date();

    const publicCoupons = await this.couponRepository.find({
      where: {
        eligibilityType: CouponEligibilityType.PUBLIC,
        isActive: true,
      },
      relations: this.couponRelations,
    });

    const roleCoupons = await this.couponRepository.find({
      where: {
        eligibilityType: CouponEligibilityType.USER_ROLE,
        isActive: true,
      },
      relations: this.couponRelations,
    });

    const eligibleRoleCoupons = roleCoupons.filter((coupon) =>
      coupon.eligibleUserRoles?.includes(user.role),
    );

    const userSpecificCoupons = await this.couponRepository
      .createQueryBuilder('coupon')
      .leftJoinAndSelect('coupon.eligibleUsers', 'user')
      .leftJoinAndSelect('coupon.eligibleCategories', 'eligibleCategories')
      .leftJoinAndSelect('coupon.eligibleProducts', 'eligibleProducts')
      .where('coupon.eligibilityType = :type', {
        type: CouponEligibilityType.SPECIFIC_USERS,
      })
      .andWhere('coupon.isActive = :isActive', { isActive: true })
      .andWhere('user.id = :userId', { userId })
      .getMany();

    const allEligibleCoupons = [
      ...publicCoupons,
      ...eligibleRoleCoupons,
      ...userSpecificCoupons,
    ];

    const validCoupons = [];
    for (const coupon of allEligibleCoupons) {
      if (coupon.validFrom && coupon.validFrom > currentDate) continue;
      if (coupon.validUntil && coupon.validUntil < currentDate) continue;

      if (coupon.maxUsage && coupon.usageCount >= coupon.maxUsage) continue;

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

  async resolveEligibleProductIds(coupon: Coupon): Promise<Set<number>> {
    const ids = new Set<number>();

    for (const product of coupon.eligibleProducts || []) {
      ids.add(Number(product.id));
    }

    const categoryIds = new Set<number>(
      (coupon.eligibleCategories || []).map((c) => Number(c.id)),
    );

    if (categoryIds.size === 0) {
      return ids;
    }

    if (coupon.includeSubcategories !== false) {
      await this.collectDescendantCategoryIds(categoryIds);
    }

    const products = await Product.createQueryBuilder('product')
      .select(['product.id'])
      .where('product.categoryId IN (:...categoryIds)', {
        categoryIds: Array.from(categoryIds),
      })
      .andWhere('product.deletedAt IS NULL')
      .getMany();

    for (const product of products) {
      ids.add(Number(product.id));
    }

    return ids;
  }

  getScopeLabel(coupon: Coupon): string {
    if (
      !coupon.scopeType ||
      coupon.scopeType === CouponScopeType.ENTIRE_ORDER
    ) {
      return 'entire order';
    }

    const categoryNames = (coupon.eligibleCategories || []).map((c) => c.name);
    const productNames = (coupon.eligibleProducts || []).map((p) => p.name);
    const parts = [...categoryNames, ...productNames];
    if (parts.length === 0) return 'selected items';
    if (parts.length <= 3) return parts.join(', ');
    return `${parts.slice(0, 2).join(', ')} +${parts.length - 2} more`;
  }

  getDiscountDescription(coupon: Coupon): string {
    const scope = this.getScopeLabel(coupon);
    if (coupon.type === CouponType.PERCENTAGE) {
      const cap = coupon.maximumDiscountAmount
        ? `, up to $${Number(coupon.maximumDiscountAmount).toFixed(2)}`
        : '';
      return `${coupon.value}% off ${scope}${cap}`;
    }
    if (coupon.type === CouponType.FIXED_AMOUNT) {
      return `$${Number(coupon.value).toFixed(2)} off ${scope}`;
    }
    const getPct = Number(coupon.bogoGetDiscountPercent ?? 100);
    const getLabel = getPct >= 100 ? 'free' : `${getPct}% off`;
    const maxSets = coupon.bogoMaxSetsPerOrder
      ? `, max ${coupon.bogoMaxSetsPerOrder} sets`
      : '';
    return `Buy ${coupon.bogoBuyQuantity} get ${coupon.bogoGetQuantity} ${getLabel} on ${scope}${maxSets}`;
  }

  async validateAndApplyCoupon(
    applyCouponDto: ApplyCouponDto,
    userId: string,
    pricedLines?: PricedLine[],
  ): Promise<CouponValidationResult> {
    const { couponCode, orderAmount } = applyCouponDto;

    const coupon = await this.couponRepository.findOne({
      where: { code: couponCode, isActive: true },
      relations: this.couponRelations,
    });

    if (!coupon) {
      return {
        isValid: false,
        message: 'This coupon code is invalid or inactive.',
      };
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      return {
        isValid: false,
        message: 'We could not find your account.',
      };
    }

    const isEligible = await this.isUserEligibleForCoupon(coupon, user);
    if (!isEligible) {
      return {
        isValid: false,
        coupon,
        message: 'You are not eligible for this coupon.',
        scopeLabel: this.getScopeLabel(coupon),
      };
    }

    const currentDate = new Date();
    if (coupon.validFrom && coupon.validFrom > currentDate) {
      return {
        isValid: false,
        coupon,
        message: 'This coupon is not active yet.',
        scopeLabel: this.getScopeLabel(coupon),
      };
    }

    if (coupon.validUntil && coupon.validUntil < currentDate) {
      return {
        isValid: false,
        coupon,
        message: 'This coupon has expired.',
        scopeLabel: this.getScopeLabel(coupon),
      };
    }

    const subtotal =
      pricedLines && pricedLines.length > 0
        ? pricedLines.reduce((sum, l) => sum + l.lineTotalCents, 0) / 100
        : Number(orderAmount ?? 0);

    if (
      coupon.minimumOrderAmount &&
      subtotal < Number(coupon.minimumOrderAmount)
    ) {
      const shortfall = (
        Number(coupon.minimumOrderAmount) - subtotal
      ).toFixed(2);
      return {
        isValid: false,
        coupon,
        message: `Add $${shortfall} more to your order to use this coupon.`,
        scopeLabel: this.getScopeLabel(coupon),
      };
    }

    if (coupon.maxUsage && coupon.usageCount >= coupon.maxUsage) {
      return {
        isValid: false,
        coupon,
        message: 'This coupon has reached its usage limit.',
        scopeLabel: this.getScopeLabel(coupon),
      };
    }

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
          coupon,
          message: 'You have already used this coupon the maximum number of times.',
          scopeLabel: this.getScopeLabel(coupon),
        };
      }
    }

    const scopeLabel = this.getScopeLabel(coupon);
    const entireOrder =
      !coupon.scopeType || coupon.scopeType === CouponScopeType.ENTIRE_ORDER;

    let eligibleProductIds: Set<number> | null = null;
    if (!entireOrder) {
      eligibleProductIds = await this.resolveEligibleProductIds(coupon);
    }

    let lines: PricedLine[] = pricedLines || [];

    // Backward-compatible path: ENTIRE_ORDER with only orderAmount
    if ((!lines || lines.length === 0) && orderAmount != null) {
      if (!entireOrder || coupon.type === CouponType.BOGO) {
        return {
          isValid: false,
          coupon,
          message:
            'This coupon needs your cart items to calculate the discount. Please try again from checkout.',
          scopeLabel,
        };
      }
      const orderCents = Math.round(Number(orderAmount) * 100);
      lines = [
        {
          productId: 0,
          unitPriceMills: orderCents * 10,
          quantity: 1,
          lineTotalCents: orderCents,
        },
      ];
      eligibleProductIds = null;
    }

    if (!lines.length) {
      return {
        isValid: false,
        coupon,
        message: 'Your cart is empty.',
        scopeLabel,
      };
    }

    const calc = calculateCouponDiscount(
      {
        type: coupon.type,
        value: Number(coupon.value),
        maximumDiscountAmount: coupon.maximumDiscountAmount,
        bogoBuyQuantity: coupon.bogoBuyQuantity,
        bogoGetQuantity: coupon.bogoGetQuantity,
        bogoGetDiscountPercent: coupon.bogoGetDiscountPercent,
        bogoMaxSetsPerOrder: coupon.bogoMaxSetsPerOrder,
        entireOrder: entireOrder || eligibleProductIds == null,
      },
      entireOrder ? null : eligibleProductIds,
      lines,
    );

    if (calc.eligibleLineCount === 0 && !entireOrder) {
      return {
        isValid: false,
        coupon,
        message: `${coupon.code} applies only to ${scopeLabel}.`,
        scopeLabel,
        eligibleLineCount: 0,
        totalLineCount: calc.totalLineCount,
        lineDiscounts: calc.lineDiscounts,
        freeUnits: 0,
      };
    }

    if (coupon.type === CouponType.BOGO && calc.freeUnits === 0) {
      const need =
        (Number(coupon.bogoBuyQuantity) || 0) +
        (Number(coupon.bogoGetQuantity) || 0);
      return {
        isValid: false,
        coupon,
        message: `Add at least ${need} qualifying items to use this buy-get offer.`,
        scopeLabel,
        eligibleLineCount: calc.eligibleLineCount,
        totalLineCount: calc.totalLineCount,
        lineDiscounts: calc.lineDiscounts,
        freeUnits: 0,
      };
    }

    if (calc.discountCents <= 0) {
      return {
        isValid: false,
        coupon,
        message: 'This coupon does not apply a discount to your current cart.',
        scopeLabel,
        eligibleLineCount: calc.eligibleLineCount,
        totalLineCount: calc.totalLineCount,
        lineDiscounts: calc.lineDiscounts,
        freeUnits: calc.freeUnits,
      };
    }

    return {
      isValid: true,
      coupon,
      discountAmount: calc.discountCents / 100,
      message: 'Coupon applied successfully',
      lineDiscounts: calc.lineDiscounts,
      eligibleLineCount: calc.eligibleLineCount,
      totalLineCount: calc.totalLineCount,
      freeUnits: calc.freeUnits,
      scopeLabel,
    };
  }

  async recordCouponUsage(
    couponId: string,
    userId: string,
    orderId: string,
    discountAmount: number,
    orderAmount: number,
  ): Promise<CouponUsage> {
    const coupon = await this.couponRepository.findOne({
      where: { id: couponId },
    });
    const user = await this.userRepository.findOne({ where: { id: userId } });

    const usage = this.couponUsageRepository.create({
      coupon,
      user,
      discountAmount,
      orderAmount,
    });

    await this.couponUsageRepository.save(usage);
    await this.couponRepository.increment({ id: couponId }, 'usageCount', 1);

    return usage;
  }

  private assertCouponConfig(
    dto: Partial<CreateCouponDto> & { type?: CouponType },
  ) {
    if (
      dto.scopeType === CouponScopeType.SPECIFIC_ITEMS &&
      !(dto.eligibleCategoryIds?.length || dto.eligibleProductIds?.length) &&
      // allow update when relations already exist on entity path
      !(
        (dto as any).eligibleCategories?.length ||
        (dto as any).eligibleProducts?.length
      )
    ) {
      throw new BadRequestException(
        'Please select at least one category or product for this coupon.',
      );
    }

    if (dto.type === CouponType.BOGO) {
      if (!dto.bogoBuyQuantity || !dto.bogoGetQuantity) {
        throw new BadRequestException(
          'Please enter both the buy and get quantities for this offer.',
        );
      }
    } else if (dto.type && dto.value == null) {
      throw new BadRequestException('Please enter a discount value.');
    }

    if (
      dto.type === CouponType.PERCENTAGE &&
      dto.value != null &&
      Number(dto.value) > 100
    ) {
      throw new BadRequestException(
        'Percentage discount cannot be more than 100.',
      );
    }
  }

  private async loadEligibleUsers(dto: {
    eligibilityType?: CouponEligibilityType;
    eligibleUserIds?: string[];
  }): Promise<User[]> {
    if (
      dto.eligibilityType !== CouponEligibilityType.SPECIFIC_USERS ||
      !dto.eligibleUserIds?.length
    ) {
      return [];
    }

    const eligibleUsers = await this.userRepository.find({
      where: { id: In(dto.eligibleUserIds) },
    });

    if (eligibleUsers.length !== dto.eligibleUserIds.length) {
      throw new BadRequestException(
        'Some of the selected users could not be found.',
      );
    }

    return eligibleUsers;
  }

  private async loadEligibleCategories(
    ids?: number[],
  ): Promise<Category[]> {
    if (!ids?.length) return [];
    const categories = await Category.find({ where: { id: In(ids) } });
    if (categories.length !== ids.length) {
      throw new BadRequestException(
        'Some of the selected categories could not be found.',
      );
    }
    return categories;
  }

  private async loadEligibleProducts(ids?: number[]): Promise<Product[]> {
    if (!ids?.length) return [];
    const products = await Product.find({ where: { id: In(ids) } });
    if (products.length !== ids.length) {
      throw new BadRequestException(
        'Some of the selected products could not be found.',
      );
    }
    return products;
  }

  private async collectDescendantCategoryIds(
    categoryIds: Set<number>,
  ): Promise<void> {
    let frontier = Array.from(categoryIds);
    while (frontier.length > 0) {
      const children = await Category.createQueryBuilder('category')
        .select(['category.id'])
        .where('category.parentId IN (:...parentIds)', {
          parentIds: frontier,
        })
        .andWhere('category.deletedAt IS NULL')
        .getMany();

      frontier = [];
      for (const child of children) {
        const id = Number(child.id);
        if (!categoryIds.has(id)) {
          categoryIds.add(id);
          frontier.push(id);
        }
      }
    }
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

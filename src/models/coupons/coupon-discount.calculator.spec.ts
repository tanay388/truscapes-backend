import {
  calculateCouponDiscount,
  PricedLine,
} from './coupon-discount.calculator';
import { CouponType } from './entities/coupon.entity';

function line(
  productId: number,
  unitPriceDollars: number,
  quantity: number,
): PricedLine {
  const unitPriceMills = Math.round(unitPriceDollars * 1000);
  const lineTotalCents = Math.floor((unitPriceMills * quantity + 5) / 10);
  return {
    productId,
    unitPriceMills,
    quantity,
    lineTotalCents,
  };
}

describe('calculateCouponDiscount', () => {
  it('applies percentage only to eligible items in a mixed cart', () => {
    const lines = [line(1, 100, 1), line(2, 50, 1)];
    const result = calculateCouponDiscount(
      {
        type: CouponType.PERCENTAGE,
        value: 50,
        entireOrder: false,
      },
      new Set([1]),
      lines,
    );

    expect(result.discountCents).toBe(5000);
    expect(result.eligibleLineCount).toBe(1);
    expect(result.lineDiscounts[0].discountCents).toBe(5000);
    expect(result.lineDiscounts[1].discountCents).toBe(0);
    expect(
      result.lineDiscounts.reduce((s, l) => s + l.discountCents, 0),
    ).toBe(result.discountCents);
  });

  it('caps fixed amount to eligible total', () => {
    const lines = [line(1, 10, 1), line(2, 100, 1)];
    const result = calculateCouponDiscount(
      {
        type: CouponType.FIXED_AMOUNT,
        value: 50,
        entireOrder: false,
      },
      new Set([1]),
      lines,
    );

    expect(result.discountCents).toBe(1000);
  });

  it('respects maximumDiscountAmount', () => {
    const lines = [line(1, 200, 1)];
    const result = calculateCouponDiscount(
      {
        type: CouponType.PERCENTAGE,
        value: 50,
        maximumDiscountAmount: 25,
        entireOrder: true,
      },
      null,
      lines,
    );

    expect(result.discountCents).toBe(2500);
  });

  it('returns zero eligible lines when none match', () => {
    const lines = [line(1, 100, 1)];
    const result = calculateCouponDiscount(
      {
        type: CouponType.PERCENTAGE,
        value: 50,
        entireOrder: false,
      },
      new Set([99]),
      lines,
    );

    expect(result.eligibleLineCount).toBe(0);
    expect(result.discountCents).toBe(0);
  });

  it('Buy 1 Get 1 gives one free for a single unit (true 1-for-1)', () => {
    const lines = [line(1, 40, 1)];
    const result = calculateCouponDiscount(
      {
        type: CouponType.BOGO,
        value: 0,
        bogoBuyQuantity: 1,
        bogoGetQuantity: 1,
        bogoGetDiscountPercent: 100,
        entireOrder: true,
      },
      null,
      lines,
    );

    expect(result.freeUnits).toBe(1);
    expect(result.discountCents).toBe(4000);
    expect(result.lineDiscounts[0].freeUnits).toBe(1);
  });

  it('Buy 1 Get 1 matches odd quantities one-for-one', () => {
    const lines = [line(1, 30, 3)];
    const result = calculateCouponDiscount(
      {
        type: CouponType.BOGO,
        value: 0,
        bogoBuyQuantity: 1,
        bogoGetQuantity: 1,
        bogoGetDiscountPercent: 100,
        entireOrder: true,
      },
      null,
      lines,
    );

    expect(result.freeUnits).toBe(3);
    expect(result.discountCents).toBe(9000);
  });

  it('Buy 2 Get 1 awards free units from paid sets only', () => {
    const lines = [line(1, 30, 3)];
    const result = calculateCouponDiscount(
      {
        type: CouponType.BOGO,
        value: 0,
        bogoBuyQuantity: 2,
        bogoGetQuantity: 1,
        bogoGetDiscountPercent: 100,
        entireOrder: true,
      },
      null,
      lines,
    );

    expect(result.freeUnits).toBe(1);
    expect(result.discountCents).toBe(3000);
  });

  it('respects bogoMaxSetsPerOrder', () => {
    const lines = [line(1, 20, 6)];
    const result = calculateCouponDiscount(
      {
        type: CouponType.BOGO,
        value: 0,
        bogoBuyQuantity: 1,
        bogoGetQuantity: 1,
        bogoGetDiscountPercent: 100,
        bogoMaxSetsPerOrder: 1,
        entireOrder: true,
      },
      null,
      lines,
    );

    expect(result.freeUnits).toBe(1);
    expect(result.discountCents).toBe(2000);
  });

  it('awards BOGO free units per product line (same-item match)', () => {
    const lines = [line(1, 40, 1), line(2, 25, 1)];
    const result = calculateCouponDiscount(
      {
        type: CouponType.BOGO,
        value: 0,
        bogoBuyQuantity: 1,
        bogoGetQuantity: 1,
        bogoGetDiscountPercent: 100,
        entireOrder: false,
      },
      new Set([1, 2]),
      lines,
    );

    expect(result.freeUnits).toBe(2);
    expect(result.lineDiscounts[0].freeUnits).toBe(1);
    expect(result.lineDiscounts[1].freeUnits).toBe(1);
    expect(result.discountCents).toBe(6500);
  });
});

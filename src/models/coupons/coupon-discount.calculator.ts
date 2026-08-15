import { CouponType } from './entities/coupon.entity';

export interface PricedLine {
  productId: number;
  variantId?: number | null;
  unitPriceMills: number;
  quantity: number;
  lineTotalCents: number;
}

export interface CouponDiscountConfig {
  type: CouponType;
  value: number;
  maximumDiscountAmount?: number | null;
  bogoBuyQuantity?: number | null;
  bogoGetQuantity?: number | null;
  bogoGetDiscountPercent?: number | null;
  bogoMaxSetsPerOrder?: number | null;
  entireOrder: boolean;
}

export interface LineDiscountResult {
  productId: number;
  variantId?: number | null;
  discountCents: number;
  freeUnits: number;
}

export interface CouponDiscountResult {
  discountCents: number;
  lineDiscounts: LineDiscountResult[];
  eligibleLineCount: number;
  totalLineCount: number;
  freeUnits: number;
}

function millsToCentsRounded(mills: number): number {
  const negative = mills < 0;
  const abs = Math.abs(mills);
  const cents = Math.floor((abs + 5) / 10);
  return negative ? -cents : cents;
}

function applyRatioRounded(
  value: number,
  numerator: number,
  denominator: number,
): number {
  const negative = value < 0;
  const abs = Math.abs(value);
  const scaled = abs * numerator;
  const rounded = Math.floor(
    (scaled + Math.floor(denominator / 2)) / denominator,
  );
  return negative ? -rounded : rounded;
}

function parseScaledInt(value: number | string, scale: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * Math.pow(10, scale));
}

function emptyLineDiscounts(lines: PricedLine[]): LineDiscountResult[] {
  return lines.map((line) => ({
    productId: line.productId,
    variantId: line.variantId,
    discountCents: 0,
    freeUnits: 0,
  }));
}

function allocateProportionally(
  lines: PricedLine[],
  eligibleIndexes: number[],
  totalDiscountCents: number,
): LineDiscountResult[] {
  const result = emptyLineDiscounts(lines);
  if (totalDiscountCents <= 0 || eligibleIndexes.length === 0) {
    return result;
  }

  const eligibleTotal = eligibleIndexes.reduce(
    (sum, i) => sum + lines[i].lineTotalCents,
    0,
  );
  if (eligibleTotal <= 0) {
    return result;
  }

  let allocated = 0;
  for (let k = 0; k < eligibleIndexes.length; k++) {
    const i = eligibleIndexes[k];
    if (k === eligibleIndexes.length - 1) {
      result[i].discountCents = totalDiscountCents - allocated;
    } else {
      const share = Math.floor(
        (totalDiscountCents * lines[i].lineTotalCents) / eligibleTotal,
      );
      result[i].discountCents = share;
      allocated += share;
    }
  }

  return result;
}

function calculateBogo(
  lines: PricedLine[],
  eligibleIndexes: number[],
  config: CouponDiscountConfig,
): CouponDiscountResult {
  const buy = Number(config.bogoBuyQuantity) || 0;
  const get = Number(config.bogoGetQuantity) || 0;
  const getPercent = Number(config.bogoGetDiscountPercent ?? 100);
  const result = emptyLineDiscounts(lines);

  if (buy <= 0 || get <= 0 || eligibleIndexes.length === 0) {
    return {
      discountCents: 0,
      lineDiscounts: result,
      eligibleLineCount: eligibleIndexes.length,
      totalLineCount: lines.length,
      freeUnits: 0,
    };
  }

  // True 1-for-1 style: every `buy` paid units on a line earn `get` ADDITIONAL free units
  // of that same line (Buy 1 Get 1 with qty 1 → 1 free; qty 3 → 3 free).
  type Allocation = { lineIndex: number; sets: number; freeUnits: number };
  const allocations: Allocation[] = [];
  let totalSets = 0;

  for (const i of eligibleIndexes) {
    const sets = Math.floor(lines[i].quantity / buy);
    if (sets <= 0) continue;
    allocations.push({
      lineIndex: i,
      sets,
      freeUnits: sets * get,
    });
    totalSets += sets;
  }

  if (totalSets <= 0) {
    return {
      discountCents: 0,
      lineDiscounts: result,
      eligibleLineCount: eligibleIndexes.length,
      totalLineCount: lines.length,
      freeUnits: 0,
    };
  }

  const maxSets =
    config.bogoMaxSetsPerOrder != null && config.bogoMaxSetsPerOrder > 0
      ? config.bogoMaxSetsPerOrder
      : null;

  if (maxSets != null && totalSets > maxSets) {
    let remaining = maxSets;
    for (const alloc of allocations) {
      const allowedSets = Math.min(alloc.sets, remaining);
      alloc.sets = allowedSets;
      alloc.freeUnits = allowedSets * get;
      remaining -= allowedSets;
    }
  }

  let discountCents = 0;
  let freeCount = 0;

  for (const alloc of allocations) {
    if (alloc.freeUnits <= 0) continue;
    const line = lines[alloc.lineIndex];
    let lineDiscountCents = 0;
    for (let f = 0; f < alloc.freeUnits; f++) {
      const unitDiscountMills = applyRatioRounded(
        line.unitPriceMills,
        Math.round(getPercent),
        100,
      );
      lineDiscountCents += millsToCentsRounded(unitDiscountMills);
    }
    result[alloc.lineIndex].discountCents = lineDiscountCents;
    result[alloc.lineIndex].freeUnits =
      getPercent >= 100 ? alloc.freeUnits : 0;
    discountCents += lineDiscountCents;
    freeCount += alloc.freeUnits;
  }

  if (
    config.maximumDiscountAmount != null &&
    Number(config.maximumDiscountAmount) > 0
  ) {
    const maxCents = parseScaledInt(config.maximumDiscountAmount, 2);
    if (discountCents > maxCents) {
      const scaleNum = maxCents;
      const scaleDen = discountCents;
      let allocated = 0;
      const nonzero = result
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => r.discountCents > 0);
      for (let k = 0; k < nonzero.length; k++) {
        const { r, i } = nonzero[k];
        if (k === nonzero.length - 1) {
          result[i].discountCents = maxCents - allocated;
        } else {
          const share = Math.floor((r.discountCents * scaleNum) / scaleDen);
          result[i].discountCents = share;
          allocated += share;
        }
      }
      discountCents = maxCents;
    }
  }

  return {
    discountCents,
    lineDiscounts: result,
    eligibleLineCount: eligibleIndexes.length,
    totalLineCount: lines.length,
    freeUnits: freeCount,
  };
}

export function calculateCouponDiscount(
  config: CouponDiscountConfig,
  eligibleProductIds: Set<number> | null,
  lines: PricedLine[],
): CouponDiscountResult {
  const eligibleIndexes: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (config.entireOrder || eligibleProductIds?.has(lines[i].productId)) {
      eligibleIndexes.push(i);
    }
  }

  if (eligibleIndexes.length === 0) {
    return {
      discountCents: 0,
      lineDiscounts: emptyLineDiscounts(lines),
      eligibleLineCount: 0,
      totalLineCount: lines.length,
      freeUnits: 0,
    };
  }

  if (config.type === CouponType.BOGO) {
    return calculateBogo(lines, eligibleIndexes, config);
  }

  const eligibleAmountCents = eligibleIndexes.reduce(
    (sum, i) => sum + lines[i].lineTotalCents,
    0,
  );

  let discountCents = 0;
  if (config.type === CouponType.PERCENTAGE) {
    discountCents = applyRatioRounded(
      eligibleAmountCents,
      Math.round(Number(config.value) || 0),
      100,
    );
  } else {
    discountCents = parseScaledInt(config.value || 0, 2);
  }

  if (
    config.maximumDiscountAmount != null &&
    Number(config.maximumDiscountAmount) > 0
  ) {
    const maxCents = parseScaledInt(config.maximumDiscountAmount, 2);
    if (discountCents > maxCents) {
      discountCents = maxCents;
    }
  }

  if (discountCents > eligibleAmountCents) {
    discountCents = eligibleAmountCents;
  }

  if (discountCents < 0) {
    discountCents = 0;
  }

  const lineDiscounts = allocateProportionally(
    lines,
    eligibleIndexes,
    discountCents,
  );

  return {
    discountCents,
    lineDiscounts,
    eligibleLineCount: eligibleIndexes.length,
    totalLineCount: lines.length,
    freeUnits: 0,
  };
}

export { millsToCentsRounded, applyRatioRounded, parseScaledInt };

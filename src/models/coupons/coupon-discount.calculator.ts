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

  type Unit = { lineIndex: number; unitPriceMills: number };
  const units: Unit[] = [];
  for (const i of eligibleIndexes) {
    const line = lines[i];
    for (let q = 0; q < line.quantity; q++) {
      units.push({ lineIndex: i, unitPriceMills: line.unitPriceMills });
    }
  }

  const setSize = buy + get;
  let sets = Math.floor(units.length / setSize);
  if (config.bogoMaxSetsPerOrder != null && config.bogoMaxSetsPerOrder > 0) {
    sets = Math.min(sets, config.bogoMaxSetsPerOrder);
  }

  const freeCount = sets * get;
  if (freeCount <= 0) {
    return {
      discountCents: 0,
      lineDiscounts: result,
      eligibleLineCount: eligibleIndexes.length,
      totalLineCount: lines.length,
      freeUnits: 0,
    };
  }

  units.sort((a, b) => a.unitPriceMills - b.unitPriceMills);
  const discountedUnits = units.slice(0, freeCount);

  let discountCents = 0;
  for (const unit of discountedUnits) {
    const unitDiscountMills = applyRatioRounded(
      unit.unitPriceMills,
      Math.round(getPercent),
      100,
    );
    const unitDiscountCents = millsToCentsRounded(unitDiscountMills);
    result[unit.lineIndex].discountCents += unitDiscountCents;
    result[unit.lineIndex].freeUnits += getPercent >= 100 ? 1 : 0;
    discountCents += unitDiscountCents;
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

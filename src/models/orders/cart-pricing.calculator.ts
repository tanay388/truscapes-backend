/**
 * Pure cart line pricing (mills/cents).
 * Keep in sync with ecommerce `src/utils/cartPricing.ts`.
 *
 * Rules:
 * - Case 5% only when explicitly CASE, allowCaseOrder, and caseSize > 1
 * - Never infer case from quantity % caseSize
 * - Pair products: billable qty = chosen qty × 2 (not when CASE)
 */

export type CartQuantityType = 'SINGLE' | 'CASE';

export type CartPricingInput = {
  /** Role-based unit price before case discount (dollars) */
  baseUnitPrice: string | number;
  /** Units chosen in the UI (cases if CASE, pairs/units if SINGLE) */
  chosenQuantity: number;
  quantityType: CartQuantityType;
  caseSize: number;
  allowCaseOrder: boolean;
  /** Product is sold in pairs; ignored when quantityType is CASE */
  isPairProduct: boolean;
};

export type CartPricingResult = {
  billableQuantity: number;
  unitPriceMills: number;
  lineTotalCents: number;
  unitPrice: number;
  lineTotal: number;
  caseDiscountApplied: boolean;
};

export function parseScaledInt(value: string | number, scale: number): number {
  const str = String(value).trim();
  if (!/^-?\d+(\.\d+)?$/.test(str)) {
    throw new Error(`Invalid money value: ${str}`);
  }

  const negative = str.startsWith('-');
  const unsigned = negative ? str.slice(1) : str;
  const [intPart, fracPartRaw = ''] = unsigned.split('.');
  const fracPart = fracPartRaw.replace(/[^0-9]/g, '');

  const base = 10 ** scale;
  const roundedDigits = fracPart.padEnd(scale + 1, '0');
  const keep = roundedDigits.slice(0, scale);
  const nextDigit = Number(roundedDigits.charAt(scale) || '0');

  let scaled = Number(intPart) * base + (keep.length ? Number(keep) : 0);
  if (nextDigit >= 5) {
    scaled += 1;
  }

  return negative ? -scaled : scaled;
}

export function applyRatioRounded(
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

export function millsToCentsRounded(mills: number): number {
  const negative = mills < 0;
  const abs = Math.abs(mills);
  const cents = Math.floor((abs + 5) / 10);
  return negative ? -cents : cents;
}

export function millsToMoney(mills: number): number {
  return mills / 1000;
}

export function centsToMoney(cents: number): number {
  return cents / 100;
}

export function resolveBillableQuantity(input: {
  chosenQuantity: number;
  quantityType: CartQuantityType;
  caseSize: number;
  isPairProduct: boolean;
}): number {
  const qty = Number(input.chosenQuantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error('Invalid quantity');
  }

  if (input.quantityType === 'CASE') {
    const caseSize = Number(input.caseSize);
    if (!Number.isFinite(caseSize) || caseSize <= 0) {
      throw new Error('Invalid case size');
    }
    return qty * caseSize;
  }

  if (input.isPairProduct) {
    return qty * 2;
  }

  return qty;
}

export function shouldApplyCaseDiscount(input: {
  quantityType: CartQuantityType;
  allowCaseOrder: boolean;
  caseSize: number;
  billableQuantity: number;
}): boolean {
  const caseSize = Number(input.caseSize);
  return (
    input.quantityType === 'CASE' &&
    Boolean(input.allowCaseOrder) &&
    Number.isFinite(caseSize) &&
    caseSize > 1 &&
    input.billableQuantity % caseSize === 0
  );
}

/** Price one cart line the same way quote/checkout must. */
export function priceCartLine(input: CartPricingInput): CartPricingResult {
  const billableQuantity = resolveBillableQuantity({
    chosenQuantity: input.chosenQuantity,
    quantityType: input.quantityType,
    caseSize: input.caseSize,
    isPairProduct: input.isPairProduct,
  });

  let unitPriceMills = parseScaledInt(input.baseUnitPrice, 3);
  const caseDiscountApplied = shouldApplyCaseDiscount({
    quantityType: input.quantityType,
    allowCaseOrder: input.allowCaseOrder,
    caseSize: input.caseSize,
    billableQuantity,
  });

  if (caseDiscountApplied) {
    unitPriceMills = applyRatioRounded(unitPriceMills, 95, 100);
  }

  const lineTotalCents = millsToCentsRounded(unitPriceMills * billableQuantity);

  return {
    billableQuantity,
    unitPriceMills,
    lineTotalCents,
    unitPrice: millsToMoney(unitPriceMills),
    lineTotal: centsToMoney(lineTotalCents),
    caseDiscountApplied,
  };
}

/** Price a line when quantity is already billable units (API quote/create). */
export function priceBillableLine(input: {
  baseUnitPrice: string | number;
  billableQuantity: number;
  isCaseOrder: boolean;
  caseSize: number;
  allowCaseOrder: boolean;
}): {
  unitPriceMills: number;
  lineTotalCents: number;
  unitPrice: number;
  lineTotal: number;
  caseDiscountApplied: boolean;
} {
  const quantity = Number(input.billableQuantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Invalid quantity');
  }

  let unitPriceMills = parseScaledInt(input.baseUnitPrice, 3);
  const caseDiscountApplied = shouldApplyCaseDiscount({
    quantityType: input.isCaseOrder ? 'CASE' : 'SINGLE',
    allowCaseOrder: input.allowCaseOrder,
    caseSize: input.caseSize,
    billableQuantity: quantity,
  });

  if (caseDiscountApplied) {
    unitPriceMills = applyRatioRounded(unitPriceMills, 95, 100);
  }

  const lineTotalCents = millsToCentsRounded(unitPriceMills * quantity);

  return {
    unitPriceMills,
    lineTotalCents,
    unitPrice: millsToMoney(unitPriceMills),
    lineTotal: centsToMoney(lineTotalCents),
    caseDiscountApplied,
  };
}

/** Build the API payload fields for quote/create from a cart line. */
export function toOrderItemPayload(input: {
  productId: number;
  variantId?: number;
  chosenQuantity: number;
  quantityType: CartQuantityType;
  caseSize: number;
  isPairProduct: boolean;
}) {
  const billableQuantity = resolveBillableQuantity(input);
  const isCaseOrder = input.quantityType === 'CASE';
  return {
    productId: input.productId,
    variantId: input.variantId,
    quantity: billableQuantity,
    isCaseOrder,
    quantityType: input.quantityType,
  };
}

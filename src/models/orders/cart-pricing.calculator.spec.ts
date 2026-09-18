import {
  priceCartLine,
  priceBillableLine,
  toOrderItemPayload,
  resolveBillableQuantity,
  shouldApplyCaseDiscount,
} from './cart-pricing.calculator';

describe('cart-pricing.calculator', () => {
  describe('resolveBillableQuantity', () => {
    it('SINGLE uses chosen qty', () => {
      expect(
        resolveBillableQuantity({
          chosenQuantity: 12,
          quantityType: 'SINGLE',
          caseSize: 12,
          isPairProduct: false,
        }),
      ).toBe(12);
    });

    it('CASE expands by caseSize', () => {
      expect(
        resolveBillableQuantity({
          chosenQuantity: 1,
          quantityType: 'CASE',
          caseSize: 12,
          isPairProduct: false,
        }),
      ).toBe(12);
    });

    it('SINGLE pair doubles qty', () => {
      expect(
        resolveBillableQuantity({
          chosenQuantity: 3,
          quantityType: 'SINGLE',
          caseSize: 12,
          isPairProduct: true,
        }),
      ).toBe(6);
    });

    it('CASE ignores pair doubling (case already in units)', () => {
      expect(
        resolveBillableQuantity({
          chosenQuantity: 1,
          quantityType: 'CASE',
          caseSize: 12,
          isPairProduct: true,
        }),
      ).toBe(12);
    });
  });

  describe('shouldApplyCaseDiscount', () => {
    it('applies for explicit CASE with caseSize > 1', () => {
      expect(
        shouldApplyCaseDiscount({
          quantityType: 'CASE',
          allowCaseOrder: true,
          caseDiscountPercent: 5,
          caseSize: 12,
          billableQuantity: 12,
        }),
      ).toBe(true);
    });

    it('does NOT apply for SINGLE even when qty is a multiple of caseSize', () => {
      expect(
        shouldApplyCaseDiscount({
          quantityType: 'SINGLE',
          allowCaseOrder: true,
          caseDiscountPercent: 5,
          caseSize: 12,
          billableQuantity: 12,
        }),
      ).toBe(false);
    });

    it('does NOT apply when caseSize is 1', () => {
      expect(
        shouldApplyCaseDiscount({
          quantityType: 'CASE',
          allowCaseOrder: true,
          caseDiscountPercent: 5,
          caseSize: 1,
          billableQuantity: 1,
        }),
      ).toBe(false);
    });

    it('does NOT apply when cases are not allowed', () => {
      expect(
        shouldApplyCaseDiscount({
          quantityType: 'CASE',
          allowCaseOrder: false,
          caseDiscountPercent: 5,
          caseSize: 12,
          billableQuantity: 12,
        }),
      ).toBe(false);
    });
  });

  describe('priceCartLine — client bug regressions', () => {
    it('CASE accent light uses mills rounding ($595.66)', () => {
      const result = priceCartLine({
        baseUnitPrice: '52.25',
        chosenQuantity: 1,
        quantityType: 'CASE',
        caseSize: 12,
        allowCaseOrder: true,
        caseDiscountPercent: 5,
        isPairProduct: false,
      });

      expect(result.caseDiscountApplied).toBe(true);
      expect(result.billableQuantity).toBe(12);
      expect(result.unitPriceMills).toBe(49638);
      expect(result.lineTotalCents).toBe(59566);
      expect(result.lineTotal).toBe(595.66);
    });

    it('12 SINGLE stem extensions with caseSize 1 get full price', () => {
      const result = priceCartLine({
        baseUnitPrice: '19.50',
        chosenQuantity: 12,
        quantityType: 'SINGLE',
        caseSize: 1,
        allowCaseOrder: true,
        caseDiscountPercent: 5,
        isPairProduct: false,
      });

      expect(result.caseDiscountApplied).toBe(false);
      expect(result.billableQuantity).toBe(12);
      expect(result.unitPriceMills).toBe(19500);
      expect(result.lineTotalCents).toBe(23400);
      expect(result.lineTotal).toBe(234);
    });

    it('12 SINGLE units with caseSize 12 do NOT get case discount', () => {
      const result = priceCartLine({
        baseUnitPrice: '19.50',
        chosenQuantity: 12,
        quantityType: 'SINGLE',
        caseSize: 12,
        allowCaseOrder: true,
        caseDiscountPercent: 5,
        isPairProduct: false,
      });

      expect(result.caseDiscountApplied).toBe(false);
      expect(result.lineTotal).toBe(234);
    });
  });

  describe('priceBillableLine matches priceCartLine for API wire format', () => {
    it('CASE order via billable qty + isCaseOrder', () => {
      const fromCart = priceCartLine({
        baseUnitPrice: '52.25',
        chosenQuantity: 1,
        quantityType: 'CASE',
        caseSize: 12,
        allowCaseOrder: true,
        caseDiscountPercent: 5,
        isPairProduct: false,
      });
      const fromApi = priceBillableLine({
        baseUnitPrice: '52.25',
        billableQuantity: 12,
        isCaseOrder: true,
        caseSize: 12,
        allowCaseOrder: true,
        caseDiscountPercent: 5,
      });
      expect(fromApi).toMatchObject({
        unitPriceMills: fromCart.unitPriceMills,
        lineTotalCents: fromCart.lineTotalCents,
        caseDiscountApplied: true,
      });
    });

    it('SINGLE 12 units is NOT discounted even if caseSize is 12', () => {
      const fromApi = priceBillableLine({
        baseUnitPrice: '19.50',
        billableQuantity: 12,
        isCaseOrder: false,
        caseSize: 12,
        allowCaseOrder: true,
        caseDiscountPercent: 5,
      });
      expect(fromApi.caseDiscountApplied).toBe(false);
      expect(fromApi.lineTotal).toBe(234);
    });
  });

  describe('priceCartLine — mixed scenarios', () => {
    it('plain SINGLE', () => {
      const result = priceCartLine({
        baseUnitPrice: '170',
        chosenQuantity: 1,
        quantityType: 'SINGLE',
        caseSize: 12,
        allowCaseOrder: true,
        caseDiscountPercent: 5,
        isPairProduct: false,
      });
      expect(result.lineTotal).toBe(170);
      expect(result.caseDiscountApplied).toBe(false);
    });

    it('pair product: 1 pair bills 2 units at unit price', () => {
      const result = priceCartLine({
        baseUnitPrice: '25',
        chosenQuantity: 1,
        quantityType: 'SINGLE',
        caseSize: 12,
        allowCaseOrder: true,
        caseDiscountPercent: 5,
        isPairProduct: true,
      });
      expect(result.billableQuantity).toBe(2);
      expect(result.lineTotal).toBe(50);
      expect(result.caseDiscountApplied).toBe(false);
    });

    it('2 cases get 5% on all units', () => {
      const result = priceCartLine({
        baseUnitPrice: '100',
        chosenQuantity: 2,
        quantityType: 'CASE',
        caseSize: 10,
        allowCaseOrder: true,
        caseDiscountPercent: 5,
        isPairProduct: false,
      });
      expect(result.billableQuantity).toBe(20);
      expect(result.caseDiscountApplied).toBe(true);
      expect(result.lineTotal).toBe(1900);
    });

    it('full client cart mix matches expected checkout subtotal', () => {
      const lines = [
        priceCartLine({
          baseUnitPrice: '170',
          chosenQuantity: 1,
          quantityType: 'SINGLE',
          caseSize: 1,
          allowCaseOrder: true,
          caseDiscountPercent: 5,
          isPairProduct: false,
        }),
        priceCartLine({
          baseUnitPrice: '52.25',
          chosenQuantity: 1,
          quantityType: 'CASE',
          caseSize: 12,
          allowCaseOrder: true,
          caseDiscountPercent: 5,
          isPairProduct: false,
        }),
        priceCartLine({
          baseUnitPrice: '19.50',
          chosenQuantity: 12,
          quantityType: 'SINGLE',
          caseSize: 1,
          allowCaseOrder: true,
          caseDiscountPercent: 5,
          isPairProduct: false,
        }),
        priceCartLine({
          baseUnitPrice: '175',
          chosenQuantity: 1,
          quantityType: 'SINGLE',
          caseSize: 12,
          allowCaseOrder: true,
          caseDiscountPercent: 5,
          isPairProduct: false,
        }),
        priceCartLine({
          baseUnitPrice: '35',
          chosenQuantity: 6,
          quantityType: 'SINGLE',
          caseSize: 12,
          allowCaseOrder: true,
          caseDiscountPercent: 5,
          isPairProduct: false,
        }),
      ];

      const subtotalCents = lines.reduce((s, l) => s + l.lineTotalCents, 0);
      // 170 + 595.66 + 234 + 175 + 210 = 1384.66
      expect(subtotalCents).toBe(138466);
      expect(lines[1].caseDiscountApplied).toBe(true);
      expect(lines[2].caseDiscountApplied).toBe(false);
    });
  });

  describe('per-product case discount percent', () => {
    const caseOf10 = (caseDiscountPercent: string | number) =>
      priceCartLine({
        baseUnitPrice: '10',
        chosenQuantity: 1,
        quantityType: 'CASE',
        caseSize: 10,
        allowCaseOrder: true,
        caseDiscountPercent,
        isPairProduct: false,
      });

    it('5% on a case of 10 × $10 is $95', () => {
      const result = caseOf10(5);
      expect(result.lineTotal).toBe(95);
      expect(result.caseDiscountPercent).toBe(5);
    });

    it('25% on a case of 10 × $10 is $75', () => {
      const result = caseOf10(25);
      expect(result.caseDiscountApplied).toBe(true);
      expect(result.unitPrice).toBe(7.5);
      expect(result.lineTotal).toBe(75);
      expect(result.caseDiscountPercent).toBe(25);
    });

    it('accepts decimal strings from the DB (numeric column)', () => {
      const result = caseOf10('7.50');
      expect(result.unitPriceMills).toBe(9250);
      expect(result.lineTotal).toBe(92.5);
      expect(result.caseDiscountPercent).toBe(7.5);
    });

    it('0% means no case discount', () => {
      const result = caseOf10(0);
      expect(result.caseDiscountApplied).toBe(false);
      expect(result.caseDiscountPercent).toBe(0);
      expect(result.lineTotal).toBe(100);
    });

    it('5% matches the previous hardcoded 95/100 rounding', () => {
      const result = priceCartLine({
        baseUnitPrice: '149.99',
        chosenQuantity: 1,
        quantityType: 'CASE',
        caseSize: 12,
        allowCaseOrder: true,
        caseDiscountPercent: '5.00',
        isPairProduct: false,
      });
      expect(result.unitPriceMills).toBe(142491);
      expect(result.lineTotal).toBe(1709.89);
    });

    it('rounds half-up in mills for odd percents', () => {
      const result = priceBillableLine({
        baseUnitPrice: '52.25',
        billableQuantity: 12,
        isCaseOrder: true,
        caseSize: 12,
        allowCaseOrder: true,
        caseDiscountPercent: 12.5,
      });
      // 52250 × 0.875 = 45718.75 → 45719 mills
      expect(result.unitPriceMills).toBe(45719);
      expect(result.baseUnitPriceMills).toBe(52250);
      expect(result.lineTotal).toBe(548.63);
    });

    it('SINGLE never gets the product percent', () => {
      const result = priceBillableLine({
        baseUnitPrice: '10',
        billableQuantity: 10,
        isCaseOrder: false,
        caseSize: 10,
        allowCaseOrder: true,
        caseDiscountPercent: 25,
      });
      expect(result.caseDiscountApplied).toBe(false);
      expect(result.caseDiscountPercent).toBe(0);
      expect(result.lineTotal).toBe(100);
    });
  });

  describe('toOrderItemPayload', () => {
    it('CASE payload expands qty and sets flags', () => {
      expect(
        toOrderItemPayload({
          productId: 42,
          variantId: 1,
          chosenQuantity: 1,
          quantityType: 'CASE',
          caseSize: 12,
          isPairProduct: false,
        }),
      ).toEqual({
        productId: 42,
        variantId: 1,
        quantity: 12,
        isCaseOrder: true,
        quantityType: 'CASE',
      });
    });

    it('SINGLE pair payload doubles qty without case flag', () => {
      expect(
        toOrderItemPayload({
          productId: 39,
          chosenQuantity: 2,
          quantityType: 'SINGLE',
          caseSize: 12,
          isPairProduct: true,
        }),
      ).toEqual({
        productId: 39,
        variantId: undefined,
        quantity: 4,
        isCaseOrder: false,
        quantityType: 'SINGLE',
      });
    });

    it('12 SINGLE does not look like a case in payload', () => {
      expect(
        toOrderItemPayload({
          productId: 6,
          chosenQuantity: 12,
          quantityType: 'SINGLE',
          caseSize: 12,
          isPairProduct: false,
        }),
      ).toMatchObject({
        quantity: 12,
        isCaseOrder: false,
        quantityType: 'SINGLE',
      });
    });
  });
});

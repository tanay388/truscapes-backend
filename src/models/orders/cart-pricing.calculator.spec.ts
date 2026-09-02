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
        isPairProduct: false,
      });
      const fromApi = priceBillableLine({
        baseUnitPrice: '52.25',
        billableQuantity: 12,
        isCaseOrder: true,
        caseSize: 12,
        allowCaseOrder: true,
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
          isPairProduct: false,
        }),
        priceCartLine({
          baseUnitPrice: '52.25',
          chosenQuantity: 1,
          quantityType: 'CASE',
          caseSize: 12,
          allowCaseOrder: true,
          isPairProduct: false,
        }),
        priceCartLine({
          baseUnitPrice: '19.50',
          chosenQuantity: 12,
          quantityType: 'SINGLE',
          caseSize: 1,
          allowCaseOrder: true,
          isPairProduct: false,
        }),
        priceCartLine({
          baseUnitPrice: '175',
          chosenQuantity: 1,
          quantityType: 'SINGLE',
          caseSize: 12,
          allowCaseOrder: true,
          isPairProduct: false,
        }),
        priceCartLine({
          baseUnitPrice: '35',
          chosenQuantity: 6,
          quantityType: 'SINGLE',
          caseSize: 12,
          allowCaseOrder: true,
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

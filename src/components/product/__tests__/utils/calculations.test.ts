import { describe, test, expect } from 'vitest';

// These functions will be extracted from ProductBalancePage during refactoring
// For now, we'll test them as they exist in the component

// Mock calculation functions extracted from ProductBalancePage
const calculateSuggestedPrice = (unitCost: number, shippingCost: number, margin?: number): number => {
  const totalCost = unitCost + shippingCost;
  const marginToUse = margin !== undefined ? margin : 25; // default 25%
  return totalCost * (1 + marginToUse / 100);
};

const calculateItemValues = (item: any, individualMargins: {[key: number]: number} = {}, defaultMargin: number = 25) => {
  const margin = individualMargins[item.product_id] !== undefined ? individualMargins[item.product_id] : defaultMargin;
  const effectiveShippingCost = item.shipping_cost || 0;
  
  const sellingPriceUnit = calculateSuggestedPrice(item.unit_price, effectiveShippingCost, margin);
  const sellingPriceTotal = sellingPriceUnit * item.quantity;
  const profitUnit = sellingPriceUnit - (item.unit_price + effectiveShippingCost);
  const profitTotal = profitUnit * item.quantity;
  
  return {
    margin,
    sellingPriceUnit,
    sellingPriceTotal,
    profitUnit,
    profitTotal,
    effectiveShippingCost
  };
};

const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(amount);
};

const calculateTotalCost = (unitPrice: number, shippingCost: number, quantity: number): number => {
  return (unitPrice + shippingCost) * quantity;
};

const calculateShippingCostFromMethod = (shippingMethod: string, costs: any): number => {
  if (shippingMethod === 'DIRECT') {
    return costs.direct || 0;
  } else if (shippingMethod === 'OCURRE') {
    return (costs.stage1 || 0) + (costs.stage2 || 0) + (costs.stage3 || 0) + (costs.stage4 || 0);
  }
  return 0;
};

// IVA calculation functions
const calculateIVAAmount = (baseAmount: number, includesIVA: boolean): number => {
  if (includesIVA) {
    // Amount already includes IVA, calculate the IVA portion
    return baseAmount - (baseAmount / 1.16);
  } else {
    // Amount doesn't include IVA, calculate IVA to add
    return baseAmount * 0.16;
  }
};

const calculatePriceWithIVA = (basePrice: number, includesIVA: boolean): number => {
  if (includesIVA) {
    return basePrice; // Already includes IVA
  } else {
    return basePrice * 1.16; // Add 16% IVA
  }
};

const calculatePriceWithoutIVA = (priceWithIVA: number): number => {
  return priceWithIVA / 1.16;
};

describe('Balance Calculations', () => {
  describe('calculateSuggestedPrice', () => {
    test('should calculate correct selling price with default margin (25%)', () => {
      const result = calculateSuggestedPrice(100, 20);
      expect(result).toBe(150); // (100 + 20) * 1.25
    });

    test('should calculate correct selling price with custom margin (30%)', () => {
      const result = calculateSuggestedPrice(100, 20, 30);
      expect(result).toBe(156); // (100 + 20) * 1.30
    });

    test('should handle zero shipping cost', () => {
      const result = calculateSuggestedPrice(100, 0, 25);
      expect(result).toBe(125); // 100 * 1.25
    });

    test('should handle zero unit cost', () => {
      const result = calculateSuggestedPrice(0, 20, 25);
      expect(result).toBe(25); // 20 * 1.25
    });

    test('should handle zero margin', () => {
      const result = calculateSuggestedPrice(100, 20, 0);
      expect(result).toBe(120); // (100 + 20) * 1.0
    });

    test('should handle decimal values correctly', () => {
      const result = calculateSuggestedPrice(99.99, 15.50, 22.5);
      expect(result).toBeCloseTo(141.47, 1); // (99.99 + 15.50) * 1.225
    });
  });

  describe('calculateItemValues', () => {
    const mockItem = {
      product_id: 1,
      unit_price: 100,
      shipping_cost: 20,
      quantity: 2
    };

    test('should calculate all values with default margin', () => {
      const result = calculateItemValues(mockItem);
      
      expect(result.margin).toBe(25);
      expect(result.sellingPriceUnit).toBe(150); // (100 + 20) * 1.25
      expect(result.sellingPriceTotal).toBe(300); // 150 * 2
      expect(result.profitUnit).toBe(30); // 150 - (100 + 20)
      expect(result.profitTotal).toBe(60); // 30 * 2
      expect(result.effectiveShippingCost).toBe(20);
    });

    test('should use individual margin when provided', () => {
      const individualMargins = { 1: 40 };
      const result = calculateItemValues(mockItem, individualMargins);
      
      expect(result.margin).toBe(40);
      expect(result.sellingPriceUnit).toBe(168); // (100 + 20) * 1.40
      expect(result.sellingPriceTotal).toBe(336); // 168 * 2
    });

    test('should handle missing shipping cost', () => {
      const itemWithoutShipping = { ...mockItem, shipping_cost: undefined };
      const result = calculateItemValues(itemWithoutShipping);
      
      expect(result.effectiveShippingCost).toBe(0);
      expect(result.sellingPriceUnit).toBe(125); // 100 * 1.25
    });

    test('should handle zero quantity', () => {
      const itemWithZeroQuantity = { ...mockItem, quantity: 0 };
      const result = calculateItemValues(itemWithZeroQuantity);
      
      expect(result.sellingPriceTotal).toBe(0);
      expect(result.profitTotal).toBe(0);
    });

    test('should handle decimal quantities', () => {
      const itemWithDecimalQuantity = { ...mockItem, quantity: 2.5 };
      const result = calculateItemValues(itemWithDecimalQuantity);
      
      expect(result.sellingPriceTotal).toBe(375); // 150 * 2.5
      expect(result.profitTotal).toBe(75); // 30 * 2.5
    });
  });

  describe('formatCurrency', () => {
    test('should format positive numbers correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
    });

    test('should format zero correctly', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    test('should format negative numbers correctly', () => {
      expect(formatCurrency(-500)).toBe('-$500.00');
    });

    test('should handle null values', () => {
      expect(formatCurrency(null)).toBe('-');
    });

    test('should handle undefined values', () => {
      expect(formatCurrency(undefined)).toBe('-');
    });

    test('should format large numbers with commas', () => {
      expect(formatCurrency(1234567.89)).toBe('$1,234,567.89');
    });
  });

  describe('calculateTotalCost', () => {
    test('should calculate total cost correctly', () => {
      const result = calculateTotalCost(100, 20, 3);
      expect(result).toBe(360); // (100 + 20) * 3
    });

    test('should handle zero values', () => {
      expect(calculateTotalCost(0, 0, 5)).toBe(0);
      expect(calculateTotalCost(100, 20, 0)).toBe(0);
    });

    test('should handle decimal values', () => {
      const result = calculateTotalCost(99.99, 15.50, 2.5);
      expect(result).toBeCloseTo(288.725, 3);
    });
  });

  describe('calculateShippingCostFromMethod', () => {
    test('should calculate DIRECT shipping cost', () => {
      const costs = { direct: 150 };
      const result = calculateShippingCostFromMethod('DIRECT', costs);
      expect(result).toBe(150);
    });

    test('should calculate OCURRE shipping cost from all stages', () => {
      const costs = {
        stage1: 50,
        stage2: 75,
        stage3: 25,
        stage4: 10
      };
      const result = calculateShippingCostFromMethod('OCURRE', costs);
      expect(result).toBe(160); // 50 + 75 + 25 + 10
    });

    test('should handle missing DIRECT cost', () => {
      const costs = {};
      const result = calculateShippingCostFromMethod('DIRECT', costs);
      expect(result).toBe(0);
    });

    test('should handle missing OCURRE stage costs', () => {
      const costs = { stage1: 50 }; // Missing other stages
      const result = calculateShippingCostFromMethod('OCURRE', costs);
      expect(result).toBe(50);
    });

    test('should handle unknown shipping method', () => {
      const costs = { direct: 100 };
      const result = calculateShippingCostFromMethod('UNKNOWN', costs);
      expect(result).toBe(0);
    });
  });

  describe('IVA Calculations', () => {
    test('should calculate IVA amount when price includes IVA', () => {
      const result = calculateIVAAmount(116, true);
      expect(result).toBeCloseTo(16, 2); // 116 - (116 / 1.16) = 16
    });

    test('should calculate IVA amount when price excludes IVA', () => {
      const result = calculateIVAAmount(100, false);
      expect(result).toBe(16); // 100 * 0.16
    });

    test('should calculate price with IVA when not included', () => {
      const result = calculatePriceWithIVA(100, false);
      expect(result).toBeCloseTo(116, 1); // 100 * 1.16
    });

    test('should return same price when IVA already included', () => {
      const result = calculatePriceWithIVA(116, true);
      expect(result).toBe(116);
    });

    test('should calculate price without IVA', () => {
      const result = calculatePriceWithoutIVA(116);
      expect(result).toBeCloseTo(100, 2); // 116 / 1.16
    });

    test('should handle zero amounts', () => {
      expect(calculateIVAAmount(0, false)).toBe(0);
      expect(calculatePriceWithIVA(0, false)).toBe(0);
      expect(calculatePriceWithoutIVA(0)).toBe(0);
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    test('should handle very large numbers', () => {
      const result = calculateSuggestedPrice(999999999, 1000000, 25);
      expect(result).toBeCloseTo(1251249999, 0); // (999999999 + 1000000) * 1.25
    });

    test('should handle very small decimal numbers', () => {
      const result = calculateSuggestedPrice(0.01, 0.02, 25);
      expect(result).toBeCloseTo(0.0375, 4);
    });

    test('should handle negative unit costs (edge case)', () => {
      // This shouldn't happen in real usage, but test defensive behavior
      const result = calculateSuggestedPrice(-50, 100, 25);
      expect(result).toBe(62.5); // (-50 + 100) * 1.25
    });

    test('should handle extremely high margins', () => {
      const result = calculateSuggestedPrice(100, 0, 1000); // 1000% margin
      expect(result).toBe(1100); // 100 * 11
    });
  });

  describe('Complex Calculation Scenarios', () => {
    test('should calculate complex balance scenario', () => {
      const items = [
        { product_id: 1, unit_price: 1200, shipping_cost: 150, quantity: 2 },
        { product_id: 2, unit_price: 800, shipping_cost: 100, quantity: 3 },
        { product_id: 3, unit_price: 450, shipping_cost: 25, quantity: 5 }
      ];
      
      const individualMargins = { 1: 30, 2: 20, 3: 35 };
      
      const results = items.map(item => calculateItemValues(item, individualMargins));
      
      // Item 1: (1200 + 150) * 1.30 = 1755 per unit, 3510 total
      expect(results[0].sellingPriceUnit).toBe(1755);
      expect(results[0].sellingPriceTotal).toBe(3510);
      
      // Item 2: (800 + 100) * 1.20 = 1080 per unit, 3240 total
      expect(results[1].sellingPriceUnit).toBe(1080);
      expect(results[1].sellingPriceTotal).toBe(3240);
      
      // Item 3: (450 + 25) * 1.35 = 641.25 per unit, 3206.25 total
      expect(results[2].sellingPriceUnit).toBeCloseTo(641.25, 2);
      expect(results[2].sellingPriceTotal).toBeCloseTo(3206.25, 2);
    });

    test('should handle mixed shipping methods in same balance', () => {
      const directCosts = { direct: 100 };
      const ocurreCosts = { stage1: 40, stage2: 30, stage3: 20, stage4: 10 };
      
      const directShipping = calculateShippingCostFromMethod('DIRECT', directCosts);
      const ocurreShipping = calculateShippingCostFromMethod('OCURRE', ocurreCosts);
      
      expect(directShipping).toBe(100);
      expect(ocurreShipping).toBe(100); // Same total, different method
      
      // Both should result in same final unit cost
      const item1 = { product_id: 1, unit_price: 200, shipping_cost: directShipping, quantity: 1 };
      const item2 = { product_id: 2, unit_price: 200, shipping_cost: ocurreShipping, quantity: 1 };
      
      const result1 = calculateItemValues(item1);
      const result2 = calculateItemValues(item2);
      
      expect(result1.sellingPriceUnit).toBe(result2.sellingPriceUnit);
    });
  });
});
// Mock data for testing ProductBalancePage
export interface MockProduct {
  id: number;
  name: string;
  sku: string;
  unit: string;
  price: number | null;
  stock: number;
  category_name?: string;
}

export interface MockSupplier {
  id: number;
  name: string;
  shipping_cost_per_unit?: number;
  shipping_cost_flat?: number;
}

export interface MockSupplierOption {
  supplier_id: number;
  supplier_name: string;
  unit_cost: number;
  shipping_cost: number;
  total_unit_cost: number;
  shipping_method: string;
  stock: number;
  lead_time_days?: number;
  supplier_sku: string;
}

export interface MockBalanceItem {
  id?: number;
  product_id: number;
  supplier_id: number;
  supplier_product_id?: number;
  product_name?: string;
  supplier_name?: string;
  unit?: string;
  quantity: number;
  unit_price: number;
  shipping_cost: number;
  shipping_method?: string;
  shipping_cost_direct?: number;
  shipping_stage1_cost?: number;
  shipping_stage2_cost?: number;
  shipping_stage3_cost?: number;
  shipping_stage4_cost?: number;
  shipping_notes?: string;
  total_cost: number;
  margin_percentage?: number;
  selling_price_unit?: number;
  selling_price_total?: number;
  profit_unit?: number;
  profit_total?: number;
  notes?: string;
}

export interface MockBalance {
  id?: number;
  name: string;
  description?: string;
  balance_type: string;
  total_amount?: number;
  currency: string;
  is_active: boolean;
  created_at?: string;
  last_updated?: string;
  items: MockBalanceItem[];
}

// Mock Products
export const mockProducts: MockProduct[] = [
  {
    id: 1,
    name: 'Bomba Solar 3500L',
    sku: 'BOMBA-SOL-001',
    unit: 'PIEZA',
    price: 15000,
    stock: 5,
    category_name: 'Bombas'
  },
  {
    id: 2,
    name: 'Panel Solar 450W',
    sku: 'PANEL-450W',
    unit: 'PIEZA', 
    price: 3200,
    stock: 20,
    category_name: 'Paneles'
  },
  {
    id: 3,
    name: 'Cable AWG 12',
    sku: 'CABLE-AWG12',
    unit: 'METRO',
    price: 25.50,
    stock: 500,
    category_name: 'Cables'
  },
  {
    id: 4,
    name: 'Fertilizante NPK',
    sku: 'FERT-NPK-001',
    unit: 'KG',
    price: 45.00,
    stock: 100,
    category_name: 'Fertilizantes'
  }
];

// Mock Suppliers
export const mockSuppliers: MockSupplier[] = [
  {
    id: 1,
    name: 'Proveedor Solar A',
    shipping_cost_per_unit: 150
  },
  {
    id: 2, 
    name: 'Proveedor Solar B',
    shipping_cost_per_unit: 120
  },
  {
    id: 3,
    name: 'Distribuidor Nacional',
    shipping_cost_per_unit: 80
  }
];

// Mock Supplier Options for Product Comparison
export const mockSupplierOptionsForBomba: MockSupplierOption[] = [
  {
    supplier_id: 1,
    supplier_name: 'Proveedor Solar A',
    unit_cost: 12000,
    shipping_cost: 150,
    total_unit_cost: 12150,
    shipping_method: 'DIRECT',
    stock: 3,
    lead_time_days: 15,
    supplier_sku: 'PSA-BOMBA-001'
  },
  {
    supplier_id: 2,
    supplier_name: 'Proveedor Solar B',
    unit_cost: 11500,
    shipping_cost: 200,
    total_unit_cost: 11700,
    shipping_method: 'OCURRE',
    stock: 2,
    lead_time_days: 10,
    supplier_sku: 'PSB-BOMBA-001'
  },
  {
    supplier_id: 3,
    supplier_name: 'Distribuidor Nacional',
    unit_cost: 13000,
    shipping_cost: 80,
    total_unit_cost: 13080,
    shipping_method: 'DIRECT',
    stock: 10,
    lead_time_days: 5,
    supplier_sku: 'DN-BOMBA-001'
  }
];

// Mock Balance Items
export const mockBalanceItems: MockBalanceItem[] = [
  {
    id: 1,
    product_id: 1,
    supplier_id: 1,
    supplier_product_id: 1,
    product_name: 'Bomba Solar 3500L',
    supplier_name: 'Proveedor Solar A',
    unit: 'PIEZA',
    quantity: 2,
    unit_price: 12000,
    shipping_cost: 150,
    shipping_method: 'DIRECT',
    shipping_cost_direct: 150,
    shipping_stage1_cost: 0,
    shipping_stage2_cost: 0,
    shipping_stage3_cost: 0,
    shipping_stage4_cost: 0,
    total_cost: 24300, // (12000 + 150) * 2
    notes: 'Entrega urgente'
  },
  {
    id: 2,
    product_id: 2,
    supplier_id: 2,
    supplier_product_id: 2,
    product_name: 'Panel Solar 450W',
    supplier_name: 'Proveedor Solar B',
    unit: 'PIEZA',
    quantity: 4,
    unit_price: 2800,
    shipping_cost: 200,
    shipping_method: 'OCURRE',
    shipping_cost_direct: 0,
    shipping_stage1_cost: 50,
    shipping_stage2_cost: 75,
    shipping_stage3_cost: 50,
    shipping_stage4_cost: 25,
    total_cost: 12000, // (2800 + 200) * 4
  },
  {
    id: 3,
    product_id: 3,
    supplier_id: 3,
    supplier_product_id: 3,
    product_name: 'Cable AWG 12',
    supplier_name: 'Distribuidor Nacional',
    unit: 'METRO',
    quantity: 100,
    unit_price: 22.50,
    shipping_cost: 0.80,
    shipping_method: 'DIRECT',
    shipping_cost_direct: 0.80,
    total_cost: 2330, // (22.50 + 0.80) * 100
  }
];

// Mock Balances
export const mockBalances: MockBalance[] = [
  {
    id: 1,
    name: 'Cotización Sistema Solar Residencial',
    description: 'Sistema completo para casa habitación',
    balance_type: 'QUOTATION',
    total_amount: 38630,
    currency: 'MXN',
    is_active: true,
    created_at: '2024-01-15T10:00:00Z',
    last_updated: '2024-01-15T15:30:00Z',
    items: mockBalanceItems
  },
  {
    id: 2,
    name: 'Balance Comparativo Bombas',
    description: 'Comparación de diferentes proveedores de bombas',
    balance_type: 'COMPARISON',
    total_amount: 24300,
    currency: 'MXN',
    is_active: true,
    created_at: '2024-01-16T09:00:00Z',
    items: [mockBalanceItems[0]]
  }
];

// Helper functions for creating test data
export const mockBalanceWithItems = (itemCount = 3): MockBalance => ({
  id: 999,
  name: 'Test Balance',
  description: 'Balance for testing',
  balance_type: 'QUOTATION',
  total_amount: itemCount * 10000,
  currency: 'MXN',
  is_active: true,
  created_at: new Date().toISOString(),
  items: Array.from({ length: itemCount }, (_, i) => ({
    id: i + 1,
    product_id: i + 1,
    supplier_id: 1,
    supplier_product_id: i + 1,
    product_name: `Test Product ${i + 1}`,
    supplier_name: 'Test Supplier',
    unit: 'PIEZA',
    quantity: 1,
    unit_price: 100,
    shipping_cost: 10,
    shipping_method: 'DIRECT',
    shipping_cost_direct: 10,
    total_cost: 110,
  }))
});

export const mockBalanceWithSingleItem = (): MockBalance => ({
  id: 998,
  name: 'Single Item Balance',
  balance_type: 'QUOTATION',
  currency: 'MXN',
  is_active: true,
  items: [{
    id: 1,
    product_id: 1,
    supplier_id: 1,
    supplier_product_id: 1,
    product_name: 'Test Product',
    supplier_name: 'Test Supplier',
    unit: 'PIEZA',
    quantity: 1,
    unit_price: 100,
    shipping_cost: 10,
    shipping_method: 'DIRECT',
    shipping_cost_direct: 10,
    total_cost: 110,
  }]
});

export const mockBalanceWithWeightProduct = (): MockBalance => ({
  id: 997,
  name: 'Weight Product Balance',
  balance_type: 'QUOTATION',
  currency: 'MXN',
  is_active: true,
  items: [{
    id: 1,
    product_id: 4,
    supplier_id: 1,
    supplier_product_id: 4,
    product_name: 'Fertilizante NPK',
    supplier_name: 'Test Supplier',
    unit: 'KG',
    quantity: 1,
    unit_price: 100,
    shipping_cost: 10,
    shipping_method: 'DIRECT',
    shipping_cost_direct: 10,
    total_cost: 110,
  }]
});

export const mockBalanceWithMultipleItems = (): MockBalance => ({
  id: 996,
  name: 'Multiple Items Balance',
  balance_type: 'QUOTATION', 
  currency: 'MXN',
  is_active: true,
  items: [
    {
      id: 1,
      product_id: 1,
      supplier_id: 1,
      supplier_product_id: 1,
      product_name: 'Product A',
      supplier_name: 'Supplier 1',
      unit: 'PIEZA',
      quantity: 2,
      unit_price: 200,
      shipping_cost: 20,
      shipping_method: 'DIRECT',
      shipping_cost_direct: 20,
      total_cost: 440, // (200 + 20) * 2
    },
    {
      id: 2,
      product_id: 2,
      supplier_id: 2,
      supplier_product_id: 2,
      product_name: 'Product B',
      supplier_name: 'Supplier 2', 
      unit: 'PIEZA',
      quantity: 3,
      unit_price: 150,
      shipping_cost: 15,
      shipping_method: 'DIRECT',
      shipping_cost_direct: 15,
      total_cost: 495, // (150 + 15) * 3
    },
    {
      id: 3,
      product_id: 3,
      supplier_id: 3,
      supplier_product_id: 3,
      product_name: 'Product C',
      supplier_name: 'Supplier 3',
      unit: 'PIEZA',
      quantity: 1,
      unit_price: 300,
      shipping_cost: 25,
      shipping_method: 'OCURRE',
      shipping_stage1_cost: 10,
      shipping_stage2_cost: 8,
      shipping_stage3_cost: 5,
      shipping_stage4_cost: 2,
      total_cost: 325, // (300 + 25) * 1
    }
  ]
});

export const mockBalanceWithManyItems = (count: number): MockBalance => ({
  id: 995,
  name: `Large Balance ${count} Items`,
  balance_type: 'QUOTATION',
  currency: 'MXN',
  is_active: true,
  items: Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    product_id: (i % 4) + 1,
    supplier_id: (i % 3) + 1,
    supplier_product_id: i + 1,
    product_name: `Bulk Product ${i + 1}`,
    supplier_name: `Supplier ${(i % 3) + 1}`,
    unit: 'PIEZA',
    quantity: 1,
    unit_price: 50 + (i * 2), 
    shipping_cost: 5,
    shipping_method: 'DIRECT',
    shipping_cost_direct: 5,
    total_cost: 55 + (i * 2),
  }))
});

export const mockCompleteBalance = (): MockBalance => mockBalances[0];

export const mockBalanceWithShippingData = (): MockBalance => ({
  id: 994,
  name: 'Shipping Test Balance',
  balance_type: 'QUOTATION',
  currency: 'MXN',
  is_active: true,
  items: [
    {
      id: 1,
      product_id: 1,
      supplier_id: 1,
      supplier_product_id: 1,
      product_name: 'Test Product',
      supplier_name: 'Test Supplier',
      unit: 'PIEZA',
      quantity: 2,
      unit_price: 100,
      shipping_cost: 10,
      shipping_method: 'DIRECT',
      shipping_cost_direct: 10,
      total_cost: 220,
    }
  ]
});

export const mockBalanceWithMargins = (): MockBalance => ({
  id: 993,
  name: 'Margin Test Balance',
  balance_type: 'QUOTATION',
  currency: 'MXN', 
  is_active: true,
  items: [
    {
      id: 1,
      product_id: 1,
      supplier_id: 1,
      supplier_product_id: 1,
      product_name: 'Margin Test Product',
      supplier_name: 'Test Supplier',
      unit: 'PIEZA',
      quantity: 1,
      unit_price: 100,
      shipping_cost: 10,
      shipping_method: 'DIRECT',
      shipping_cost_direct: 10,
      total_cost: 110,
      margin_percentage: 25,
      selling_price_unit: 137.50,
      selling_price_total: 137.50,
      profit_unit: 27.50,
      profit_total: 27.50,
    }
  ]
});

export const mockProductComparison = {
  product_id: 1,
  product_name: 'Bomba Solar 3500L',
  product_sku: 'BOMBA-SOL-001',
  suppliers: mockSupplierOptionsForBomba
};
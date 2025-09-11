// API types for the new Kit and Balance features

export interface Product {
  id: number;
  name: string;
  sku: string;
  unit: string;
  price: number | null;
  stock: number;
  category_name?: string;
  category_id?: number;
  description?: string;
  base_sku?: string;
  package_size?: number | null;
  iva?: boolean;
  specifications?: any;
  default_margin?: number | null;
  is_active?: boolean;
  created_at?: string;
  last_updated?: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  shipping_cost_per_unit?: number;
  shipping_cost_flat?: number;
  payment_terms?: string;
  notes?: string;
  is_active?: boolean;
  created_at?: string;
  last_updated?: string;
}

export interface SupplierProduct {
  id: number;
  supplier_id: number;
  product_id: number;
  supplier_sku: string;
  cost: number | null;
  stock: number;
  lead_time_days?: number;
  shipping_method?: string;
  shipping_cost_direct?: number;
  shipping_stage1_cost?: number;
  shipping_stage2_cost?: number;
  shipping_stage3_cost?: number;
  shipping_stage4_cost?: number;
  shipping_notes?: string;
  notes?: string;
  is_active?: boolean;
  supplier?: Supplier;
  product?: Product;
  // Flattened fields from API response
  supplier_name?: string;
  product_name?: string;
  product_sku?: string;
  created_at?: string;
  last_updated?: string;
}

// Kit Management Types
export interface KitProduct {
  product_id: number;
  quantity: number;
  product?: Product;
}

export interface Kit {
  id?: number;
  name: string;
  description?: string;
  sku: string;
  price?: number;
  is_active: boolean;
  products: KitProduct[];
  created_at?: string;
  last_updated?: string;
}

export interface CreateKitRequest {
  name: string;
  description?: string;
  sku: string;
  price?: number;
  is_active: boolean;
  products: {
    product_id: number;
    quantity: number;
  }[];
}

export interface UpdateKitRequest extends Partial<CreateKitRequest> {
  id: number;
}

// Product Balance/Comparison Types
export interface SupplierComparison {
  supplier_id: number;
  supplier_name: string;
  supplier_sku: string;
  unit_price: number;
  total_price: number;
  shipping_per_unit: number;
  shipping_total: number;
  real_cost_per_unit: number;
  real_total_cost: number;
  margin_percentage: number;
  selling_price_per_unit: number;
  selling_total_price: number;
  profit_per_unit: number;
  profit_total: number;
}

export interface BalanceItem {
  id: string;
  product_id: number;
  product_name: string;
  quantity: number;
  unit: string;
  supplier_comparisons: SupplierComparison[];
  selected_supplier_id?: number;
}

export interface QuoteAnalysis {
  name?: string;
  description?: string;
  default_margin: number;
  items: BalanceItem[];
  total_cost: number;
  total_selling_price: number;
  total_profit: number;
  created_at?: string;
  last_updated?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// Kit API Responses
export interface KitsResponse {
  kits: Kit[];
  total: number;
}

export interface KitResponse {
  kit: Kit;
}

// Balance API Types
export interface ProductComparisonRequest {
  product_id: number;
  quantity: number;
  margin_percentage?: number;
}

export interface ProductComparisonResponse {
  product: Product;
  quantity: number;
  supplier_comparisons: SupplierComparison[];
}

export interface BulkComparisonRequest {
  products: ProductComparisonRequest[];
  default_margin?: number;
}

export interface BulkComparisonResponse {
  comparisons: ProductComparisonResponse[];
  summary: {
    total_products: number;
    total_suppliers: number;
    best_cost_total: number;
    best_selling_total: number;
    best_profit_total: number;
  };
}

// Export utility for API endpoints
export const API_ENDPOINTS = {
  // Kit endpoints
  KITS: '/kits',
  KIT_BY_ID: (id: number) => `/kits/${id}`,
  
  // Balance/Comparison endpoints
  PRODUCT_COMPARISON: '/products/comparison',
  BULK_COMPARISON: '/products/bulk-comparison',
  
  // Existing endpoints
  PRODUCTS: '/products',
  SUPPLIERS: '/suppliers',
  SUPPLIER_PRODUCTS: '/products/supplier-products',
  CATEGORIES: '/categories',
} as const;


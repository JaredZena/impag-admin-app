import { ProductCategory, ProductRef } from '../types/socialCalendar';
import { apiRequest } from '../utils/api';

export interface ProductService {
  fetchProductsByCategories(
    categories: ProductCategory[],
    options?: {
      inStockOnly?: boolean;
      limit?: number;
      excludeIds?: string[];
    }
  ): Promise<ProductRef[]>;

  fetchProductById(id: string): Promise<ProductRef | null>;

  fetchHighRotationProducts(): Promise<ProductRef[]>;
}

const normalizeCategory = (categoryName: string | undefined): ProductCategory => {
  if (!categoryName) return 'vivero';
  const lower = categoryName.toLowerCase();
  if (lower.includes('malla')) return 'mallasombra';
  if (lower.includes('riego')) return 'riego';
  if (lower.includes('bombeo') || lower.includes('solar')) return 'bombeo-solar';
  if (lower.includes('anti')) return 'antiheladas';
  if (lower.includes('acolchado')) return 'acolchado';
  if (lower.includes('charola')) return 'charolas';
  if (lower.includes('valvula')) return 'valvuleria';
  if (lower.includes('cerca')) return 'cercas';
  if (lower.includes('plaga')) return 'control-plagas';
  if (lower.includes('estruct')) return 'estructuras';
  if (lower.includes('kit')) return 'kits';
  if (lower.includes('plastic')) return 'plasticos';
  return 'vivero';
};

const mapProduct = (p: any): ProductRef => ({
  id: String(
    p.id ??
    p.product_id ??
    (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now())
  ),
  name: p.name || p.title || 'Producto sin nombre',
  category: normalizeCategory(p.category?.name || p.category || p.category_name),
  imageUrl: p.image_url || p.thumbnail || undefined,
  price: p.price ?? p.list_price,
  inStock: p.inStock ?? (p.stock !== undefined ? p.stock > 0 : undefined),
  specs: p.specs || [],
  sku: p.sku,
});

export class HttpProductService implements ProductService {
  async fetchProductsByCategories(
    categories: ProductCategory[],
    options?: {
      inStockOnly?: boolean;
      limit?: number;
      excludeIds?: string[];
    }
  ): Promise<ProductRef[]> {
    const params = new URLSearchParams();
    if (categories.length > 0) {
      params.append('categories', categories.join(','));
    }
    if (options?.inStockOnly) params.append('in_stock', 'true');
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.excludeIds?.length) params.append('exclude_ids', options.excludeIds.join(','));

    try {
      const response = await apiRequest(`/products?${params.toString()}`);
      const list = response.data || response.products || [];
      return list.map(mapProduct);
    } catch (error) {
      console.error('Failed to fetch products for social calendar:', error);
      return [];
    }
  }

  async fetchProductById(id: string): Promise<ProductRef | null> {
    try {
      const response = await apiRequest(`/products/${id}`);
      const raw = response.data || response;
      return raw ? mapProduct(raw) : null;
    } catch (error) {
      console.error(`Failed to fetch product ${id}:`, error);
      return null;
    }
  }

  async fetchHighRotationProducts(): Promise<ProductRef[]> {
    // Simple heuristic: fetch a small batch of in-stock items
    return this.fetchProductsByCategories([], { inStockOnly: true, limit: 12 });
  }
}




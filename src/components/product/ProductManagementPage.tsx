import React, { useState, useEffect, useCallback } from 'react';
import ProductSearchBar from './ProductSearchBar';
import ProductTable from './ProductTable';
import { ProductRowProps } from './ProductRow';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { apiRequest } from '@/utils/api';

const PAGE_SIZE = 50;

const ProductManagementPage: React.FC = () => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [supplier, setSupplier] = useState('');
  const [products, setProducts] = useState<(ProductRowProps & { description?: string; supplierNames?: string[]; lastUpdated?: string; createdAt?: string; })[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const [filters, setFilters] = useState({ name: '', category: '', supplier: '' });

  // Fetch categories and suppliers on mount
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [catData, supData] = await Promise.all([
          apiRequest('/categories'),
          apiRequest('/suppliers'),
        ]);
        setCategoryOptions((catData.data || []).map((c: any) => ({ value: String(c.id), label: c.name })));
        setSupplierOptions((supData.data || []).map((s: any) => ({ value: String(s.id), label: s.name })));
      } catch (err) {
        // Optionally handle error
      }
    };
    fetchOptions();
  }, []);

  // Reset products and pagination when filters change
  useEffect(() => {
    setProducts([]);
    setSkip(0);
    setHasMore(true);
  }, [filters]);

  // Fetch products (initial and on filter change)
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (filters.name) params.append('name', filters.name);
        if (filters.category) params.append('category_id', filters.category);
        if (filters.supplier) params.append('supplier_id', filters.supplier);
        params.append('skip', '0');
        params.append('limit', PAGE_SIZE.toString());
        params.append('sort_by', 'name');
        params.append('sort_order', 'asc');
        const data = await apiRequest(`/products?${params.toString()}`);
        const mapped: (ProductRowProps & { description?: string; supplierNames?: string[]; lastUpdated?: string; createdAt?: string; })[] = (data.data || []).map((p: any) => {
          const categoryName = categoryOptions.find(cat => cat.value === String(p.category_id))?.label || '';
          const supplierNames = (p.suppliers || []).map((s: any) => s.name || s);
          return {
            id: p.id,
            name: p.name,
            sku: p.base_sku || '',
            category: categoryName,
            suppliers: supplierNames,
            status: p.is_active ? 'active' : 'inactive',
            description: p.description || '',
            supplierNames,
            lastUpdated: p.last_updated || '',
            createdAt: p.created_at || '',
          };
        });
        setProducts(mapped);
        setHasMore((data.data || []).length === PAGE_SIZE);
        setSkip(PAGE_SIZE);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, categoryOptions, supplierOptions]);

  // Load more products (infinite scroll)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      if (filters.name) params.append('name', filters.name);
      if (filters.category) params.append('category_id', filters.category);
      if (filters.supplier) params.append('supplier_id', filters.supplier);
      params.append('skip', skip.toString());
      params.append('limit', PAGE_SIZE.toString());
      params.append('sort_by', 'name');
      params.append('sort_order', 'asc');
      const data = await apiRequest(`/products?${params.toString()}`);
      const mapped: (ProductRowProps & { description?: string; supplierNames?: string[]; lastUpdated?: string; createdAt?: string; })[] = (data.data || []).map((p: any) => {
        const categoryName = categoryOptions.find(cat => cat.value === String(p.category_id))?.label || '';
        const supplierNames = (p.suppliers || []).map((s: any) => s.name || s);
        return {
          id: p.id,
          name: p.name,
          sku: p.base_sku || '',
          category: categoryName,
          suppliers: supplierNames,
          status: p.is_active ? 'active' : 'inactive',
          description: p.description || '',
          supplierNames,
          lastUpdated: p.last_updated || '',
          createdAt: p.created_at || '',
        };
      });
      setProducts(prev => [...prev, ...mapped]);
      setHasMore((data.data || []).length === PAGE_SIZE);
      setSkip(prev => prev + PAGE_SIZE);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoadingMore(false);
    }
  }, [filters, skip, loadingMore, hasMore, categoryOptions, supplierOptions]);

  const sentinelRef = useInfiniteScroll({
    hasMore,
    loading: loadingMore,
    onLoadMore: loadMore,
  });

  // Handlers for search/filter changes
  const handleNameChange = (v: string) => setFilters(f => ({ ...f, name: v }));
  const handleCategoryChange = (v: string) => setFilters(f => ({ ...f, category: v }));
  const handleSupplierChange = (v: string) => setFilters(f => ({ ...f, supplier: v }));

  return (
    <div className="container mx-auto max-w-7xl xl:max-w-8xl 2xl:max-w-screen-2xl 3xl:max-w-9xl px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-20 3xl:px-32">
      <h1 className="text-2xl font-bold mb-6">Product Management</h1>
      <ProductSearchBar
        name={filters.name}
        category={filters.category}
        supplier={filters.supplier}
        onNameChange={handleNameChange}
        onCategoryChange={handleCategoryChange}
        onSupplierChange={handleSupplierChange}
        categoryOptions={categoryOptions}
        supplierOptions={supplierOptions}
      />
      {loading && products.length === 0 ? (
        <div className="text-muted-foreground py-8">Loading products...</div>
      ) : error ? (
        <div className="text-destructive py-8">{error}</div>
      ) : (
        <>
          <ProductTable products={products} />
          <div ref={sentinelRef} />
          {loadingMore && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-400" />
            </div>
          )}
          {!hasMore && products.length > 0 && (
            <div className="text-center text-xs text-muted-foreground py-4">No more products to load.</div>
          )}
        </>
      )}
    </div>
  );
};

export default ProductManagementPage; 
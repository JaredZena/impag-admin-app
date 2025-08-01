import React, { useState, useEffect, useCallback } from 'react';
import ProductSearchBar from './ProductSearchBar';
import ProductTable from './ProductTable';
import { ProductRowProps } from './ProductRow';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { apiRequest } from '@/utils/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
  const [optionsLoaded, setOptionsLoaded] = useState(false);

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
        setOptionsLoaded(true);
      } catch (err) {
        // Even if options fail to load, we should still allow product fetching
        setOptionsLoaded(true);
        console.error('Failed to load options:', err);
      }
    };
    fetchOptions();
  }, []);

  // Helper function to map products with proper category names
  const mapProducts = useCallback((rawProducts: any[], categoryOpts: { value: string; label: string }[]): (ProductRowProps & { description?: string; supplierNames?: string[]; lastUpdated?: string; createdAt?: string; })[] => {
    return rawProducts.map((p: any) => {
      const categoryName = categoryOpts.find(cat => cat.value === String(p.category_id))?.label || `Category ${p.category_id}` || 'Unknown';
      const supplierNames = (p.suppliers || []).map((s: any) => s.name || s);
      return {
        id: p.id,
        name: p.name || 'Unnamed Product',
        sku: p.base_sku || '',
        category: categoryName,
        suppliers: supplierNames,
        status: (p.is_active ? 'active' : 'inactive') as 'active' | 'inactive',
        description: p.description || '',
        supplierNames,
        lastUpdated: p.last_updated || '',
        createdAt: p.created_at || '',
      };
    });
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
      // Allow search to happen immediately if user is searching/filtering
      if (!optionsLoaded && filters.name === '' && filters.category === '' && filters.supplier === '') {
        // Only wait for options to load on initial page load with no filters
        return;
      }

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
        const mapped = mapProducts(data.data || [], categoryOptions);
        
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
  }, [filters, optionsLoaded, categoryOptions, mapProducts]);

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
      const mapped = mapProducts(data.data || [], categoryOptions);
      
      // Deduplicate products to prevent duplicate keys
      setProducts(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newProducts = mapped.filter(p => !existingIds.has(p.id));
        return [...prev, ...newProducts];
      });
      
      setHasMore((data.data || []).length === PAGE_SIZE);
      setSkip(prev => prev + PAGE_SIZE);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoadingMore(false);
    }
  }, [filters, skip, loadingMore, hasMore, categoryOptions, mapProducts]);

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
    <div className="w-screen min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 overflow-x-hidden">
      <div className="container mx-auto max-w-7xl 2xl:max-w-screen-2xl px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 py-4 sm:py-6 lg:py-8">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent mb-2">
            Gestión de Productos
          </h1>
          <p className="text-sm sm:text-base text-gray-600">Administra tu catálogo de productos, precios y proveedores</p>
        </div>

        {/* Search and Filter Card */}
        <Card className="p-3 sm:p-4 md:p-6 mb-6 sm:mb-8 shadow-lg border-0 rounded-xl">
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
        </Card>

        {error ? (
          <Card className="p-6 sm:p-8 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Error al Cargar Productos</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="bg-green-600 hover:bg-green-700 text-sm sm:text-base"
            >
              Intentar de Nuevo
            </Button>
          </Card>
        ) : (
          <>
            <ProductTable products={products} loading={loading && products.length === 0} />
            
            {loadingMore && (
              <div className="flex items-center justify-center py-6 sm:py-8">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-green-600"></div>
                  <span className="text-sm sm:text-base text-gray-600">Cargando más productos...</span>
                </div>
              </div>
            )}
            
            {!hasMore && products.length > 0 && (
              <div className="text-center py-6 sm:py-8">
                <div className="inline-flex items-center space-x-2 px-3 sm:px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>No hay más productos para mostrar</span>
                </div>
              </div>
            )}
          </>
        )}
        
        <div ref={sentinelRef} style={{ height: '1px' }} />
      </div>
    </div>
  );
};

export default ProductManagementPage; 
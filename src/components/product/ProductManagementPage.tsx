import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductSearchBar from './ProductSearchBar';
import ProductTable from './ProductTable';
import { ProductRowProps } from './ProductRow';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { apiRequest } from '@/utils/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const PAGE_SIZE = 50;

const ProductManagementPage: React.FC = () => {
  const navigate = useNavigate();
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
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'last_updated' | 'category_name'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Sorting handlers
  const handleSortChange = (field: 'name' | 'created_at' | 'last_updated' | 'category_name') => {
    if (sortBy === field) {
      // If clicking the same field, toggle order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // If clicking a different field, set to asc by default
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Function to fetch total product count
  const fetchTotalCount = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.name) params.append('name', filters.name);
      if (filters.category) params.append('category_id', filters.category);
      if (filters.supplier) params.append('supplier_id', filters.supplier);
      params.append('limit', '1'); // We only need the count, so limit to 1
      
      const url = `/products?${params.toString()}`;
      const response = await apiRequest(url);
      
      // The backend should return total count in the response
      // If not available, we'll need to make a separate count endpoint
      if (response.total_count !== undefined) {
        setTotalCount(response.total_count);
      } else {
        // Fallback: get all products to count them (not ideal for performance)
        const allParams = new URLSearchParams();
        if (filters.name) allParams.append('name', filters.name);
        if (filters.category) allParams.append('category_id', filters.category);
        if (filters.supplier) allParams.append('supplier_id', filters.supplier);
        allParams.append('limit', '10000'); // High limit to get all
        
        const allResponse = await apiRequest(`/products?${allParams.toString()}`);
        setTotalCount((allResponse.data || []).length);
      }
    } catch (err) {
      console.error('Error fetching total count:', err);
      setTotalCount(0);
    }
  }, [filters]);

  // Fetch categories and suppliers on mount
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        console.log('🔄 Fetching categories and suppliers...');
        const [catData, supData] = await Promise.all([
          apiRequest('/categories'),
          apiRequest('/suppliers'),
        ]);
        
        console.log('📂 Raw categories data:', catData);
        console.log('🏭 Raw suppliers data:', supData);
        
        const categoryOpts = (catData.data || []).map((c: any) => ({ value: String(c.id), label: c.name }));
        const supplierOpts = (supData.data || []).map((s: any) => ({ value: String(s.id), label: s.name }));
        
        console.log('📂 Processed category options:', categoryOpts);
        console.log('🏭 Processed supplier options:', supplierOpts);
        
        setCategoryOptions(categoryOpts);
        setSupplierOptions(supplierOpts);
        setOptionsLoaded(true);
      } catch (err) {
        // Even if options fail to load, we should still allow product fetching
        console.error('❌ Failed to load options:', err);
        setOptionsLoaded(true);
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
        price: p.price || null,
        unit: p.unit || 'N/A',
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

  // Reset products and pagination when filters or sorting change
  useEffect(() => {
    setProducts([]);
    setSkip(0);
    setHasMore(true);
  }, [filters, sortBy, sortOrder]);

  // Fetch products (initial and on filter change)
  useEffect(() => {
    const fetchProducts = async () => {
      // Allow search to happen immediately if user is searching/filtering
      if (!optionsLoaded && filters.name === '' && filters.category === '' && filters.supplier === '') {
        // Only wait for options to load on initial page load with no filters
        return;
      }

      console.log('🔍 Fetching products with filters:', filters);
      console.log('📋 Available supplier options:', supplierOptions);
      
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (filters.name) params.append('name', filters.name);
        if (filters.category) params.append('category_id', filters.category);
        if (filters.supplier) params.append('supplier_id', filters.supplier);
        params.append('skip', '0');
        params.append('limit', PAGE_SIZE.toString());
        params.append('sort_by', sortBy);
        params.append('sort_order', sortOrder);
        
        const url = `/products?${params.toString()}`;
        console.log('🌐 API URL:', url);
        
        const data = await apiRequest(url);
        console.log('📦 API Response:', data);
        
        const mapped = mapProducts(data.data || [], categoryOptions);
        console.log('🗺️ Mapped products:', mapped);
        
        setProducts(mapped);
        setHasMore((data.data || []).length === PAGE_SIZE);
        setSkip(PAGE_SIZE);
      } catch (err: any) {
        console.error('❌ Error fetching products:', err);
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
    fetchTotalCount(); // Also fetch total count when filters change
  }, [filters, sortBy, sortOrder, optionsLoaded, categoryOptions, mapProducts, fetchTotalCount]);

  // Load more products (infinite scroll)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    console.log('📄 Loading more products with filters:', filters);
    
    setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      if (filters.name) params.append('name', filters.name);
      if (filters.category) params.append('category_id', filters.category);
      if (filters.supplier) params.append('supplier_id', filters.supplier);
      params.append('skip', skip.toString());
      params.append('limit', PAGE_SIZE.toString());
      params.append('sort_by', sortBy);
      params.append('sort_order', sortOrder);
      
      const url = `/products?${params.toString()}`;
      console.log('🌐 LoadMore API URL:', url);
      
      const data = await apiRequest(url);
      console.log('📦 LoadMore API Response:', data);
      
      const mapped = mapProducts(data.data || [], categoryOptions);
      
      // Deduplicate products to prevent duplicate keys
      setProducts(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newProducts = mapped.filter(p => !existingIds.has(p.id));
        console.log('➕ Adding new products:', newProducts.length);
        return [...prev, ...newProducts];
      });
      
      setHasMore((data.data || []).length === PAGE_SIZE);
      setSkip(prev => prev + PAGE_SIZE);
    } catch (err: any) {
      console.error('❌ Error loading more products:', err);
      setError(err.message || 'Unknown error');
    } finally {
      setLoadingMore(false);
    }
  }, [filters, sortBy, sortOrder, skip, loadingMore, hasMore, categoryOptions, mapProducts]);

  const sentinelRef = useInfiniteScroll({
    hasMore,
    loading: loadingMore,
    onLoadMore: loadMore,
  });

  // Handlers for search/filter changes
  const handleNameChange = (v: string) => setFilters(f => ({ ...f, name: v }));
  const handleCategoryChange = (v: string) => setFilters(f => ({ ...f, category: v }));
  const handleSupplierChange = (v: string) => {
    console.log('🏭 Supplier filter changed to:', v);
    setFilters(f => ({ ...f, supplier: v }));
  };

  return (
    <div className="w-screen min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 overflow-x-hidden">
      <div className="container mx-auto max-w-7xl 2xl:max-w-screen-2xl px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 pt-20 pb-8">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent mb-2">
                Gestión de Productos
              </h1>
              <p className="text-sm sm:text-base text-gray-600">Administra tu catálogo de productos, precios y proveedores</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              {/* Navigation moved to global navigation bar */}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mb-6">
            <Button 
              onClick={() => navigate('/product-admin/new')}
              className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Agregar Nuevo Producto
            </Button>
          </div>
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

        {/* Sorting Controls */}
        <Card className="p-4 mb-6 shadow-sm border-0 rounded-xl bg-gradient-to-r from-gray-50 to-green-50">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Ordenar por:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={sortBy === 'name' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSortChange('name')}
                className={`text-xs font-medium transition-all duration-200 ${sortBy === 'name' ? 'shadow-md' : ''}`}
              >
                <span>Nombre</span>
                {sortBy === 'name' && (
                  <span className="ml-1 text-xs">
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </Button>
              <Button
                variant={sortBy === 'category_name' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSortChange('category_name')}
                className={`text-xs font-medium transition-all duration-200 ${sortBy === 'category_name' ? 'shadow-md' : ''}`}
              >
                <span>Categoría</span>
                {sortBy === 'category_name' && (
                  <span className="ml-1 text-xs">
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </Button>
              <Button
                variant={sortBy === 'created_at' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSortChange('created_at')}
                className={`text-xs font-medium transition-all duration-200 ${sortBy === 'created_at' ? 'shadow-md' : ''}`}
              >
                <span>Creado</span>
                {sortBy === 'created_at' && (
                  <span className="ml-1 text-xs">
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </Button>
              <Button
                variant={sortBy === 'last_updated' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSortChange('last_updated')}
                className={`text-xs font-medium transition-all duration-200 ${sortBy === 'last_updated' ? 'shadow-md' : ''}`}
              >
                <span>Actualizado</span>
                {sortBy === 'last_updated' && (
                  <span className="ml-1 text-xs">
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {error ? (
          <Card className="p-6 sm:p-8 text-center shadow-lg border-0 rounded-xl border-red-200 bg-red-50">
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-red-800 mb-2">Error al Cargar Productos</h2>
            <p className="text-sm sm:text-base text-red-600 mb-4 max-w-md mx-auto">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={() => window.location.reload()} 
                className="bg-green-600 hover:bg-green-700 text-sm sm:text-base"
              >
                Recargar Página
              </Button>
              <Button 
                onClick={() => setError(null)} 
                variant="outline"
                className="text-sm sm:text-base"
              >
                Cerrar Error
              </Button>
            </div>
          </Card>
        ) : (
          <>
            <ProductTable 
              products={products} 
              loading={loading && products.length === 0}
              hasFilters={!!(filters.name || filters.category || filters.supplier)}
              onAddProduct={() => navigate('/product-admin/new')}
              totalCount={totalCount}
            />
            
            {loadingMore && (
              <div className="flex items-center justify-center py-6 sm:py-8">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-green-600"></div>
                  <span className="text-sm sm:text-base text-gray-600 font-medium">Cargando más productos...</span>
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
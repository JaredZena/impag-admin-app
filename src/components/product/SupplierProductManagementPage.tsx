import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/utils/api';
import { formatCurrency } from '@/utils/currencyUtils';
import { formatDate } from '@/utils/dateUtils';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

interface Supplier {
  id: number;
  name: string;
  contact_name?: string;
  email?: string;
}

interface Product {
  id: number;
  name: string;
  sku: string;
  category_name?: string;
}

interface SupplierProduct {
  id: number;
  supplier_id: number;
  product_id: number;
  supplier_sku?: string;
  cost?: number;
  currency?: string;
  stock: number;
  lead_time_days?: number;
  shipping_method?: string;
  shipping_cost_direct?: number;
  shipping_stage1_cost?: number;
  shipping_stage2_cost?: number;
  shipping_stage3_cost?: number;
  shipping_stage4_cost?: number;
  shipping_notes?: string;
  includes_iva?: boolean;
  iva_amount?: number;
  unit_price_with_iva?: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
  last_updated?: string;
  supplier?: Supplier;
  product?: Product;
  // Flattened fields from API response
  supplier_name?: string;
  product_name?: string;
  product_sku?: string;
  category_id?: number;
  category_name?: string;
  description?: string;
  unit?: string;
}

const PAGE_SIZE = 50;

const SupplierProductManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [relationships, setRelationships] = useState<SupplierProduct[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<{id: number; name: string}[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const [categoryMap, setCategoryMap] = useState<Record<number, string>>({});
  const initialLoadComplete = useRef(false);
  
  // Get state from URL params with defaults
  const searchTerm = searchParams.get('search') || '';
  const filterSupplier = searchParams.get('supplier') || '';
  const filterCategory = searchParams.get('category') || '';
  const filterCurrency = searchParams.get('currency') || '';
  const filterPriceMin = searchParams.get('priceMin') || '';
  const filterPriceMax = searchParams.get('priceMax') || '';
  const sortBy = (searchParams.get('sortBy') || 'product_name') as 'product_name' | 'supplier_name' | 'cost' | 'created_at' | 'last_updated';
  const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc';

  // Helper function to update URL params
  const updateSearchParams = (updates: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });
    setSearchParams(newParams);
  };

  // Wrapper functions for state updates
  const setSearchTerm = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set('search', value);
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams);
  };
  
  const setFilterSupplier = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set('supplier', value);
    } else {
      newParams.delete('supplier');
    }
    setSearchParams(newParams);
  };
  
  const setFilterCategory = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set('category', value);
    } else {
      newParams.delete('category');
    }
    setSearchParams(newParams);
  };
  
  const setFilterCurrency = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set('currency', value);
    } else {
      newParams.delete('currency');
    }
    setSearchParams(newParams);
  };
  
  const setFilterPriceMin = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set('priceMin', value);
    } else {
      newParams.delete('priceMin');
    }
    setSearchParams(newParams);
  };
  
  const setFilterPriceMax = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set('priceMax', value);
    } else {
      newParams.delete('priceMax');
    }
    setSearchParams(newParams);
  };

  // Initial load - fetch suppliers and categories, then first page of relationships
  useEffect(() => {
    const initialLoad = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch suppliers and categories first
        const [suppliersData, categoriesData] = await Promise.all([
          apiRequest('/suppliers'),
          apiRequest('/categories')
        ]);

        // Create category lookup
        const catMap = (categoriesData.data || []).reduce((acc: any, cat: any) => {
          acc[cat.id] = cat.name;
          return acc;
        }, {});

        setCategoryMap(catMap);
        setSuppliers(suppliersData.data || []);
        setCategories(categoriesData.data || []);

        // Fetch first page of relationships with the category map we just created
        await fetchRelationshipsPage(0, true, catMap);
        initialLoadComplete.current = true;
      } catch (err: any) {
        setError(err.message || 'Error al cargar los datos');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    initialLoad();
  }, []);

  // Fetch a page of relationships
  const fetchRelationshipsPage = useCallback(async (pageSkip: number, isInitialLoad = false, catMap?: Record<number, string>) => {
    try {
      const params = new URLSearchParams();
      params.append('skip', pageSkip.toString());
      params.append('limit', PAGE_SIZE.toString());
      
      // Apply backend-supported filters
      if (filterSupplier) {
        params.append('supplier_id', filterSupplier);
      }
      
      // Add search parameter if search term exists
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const url = `/products/supplier-products?${params.toString()}`;
      const relationshipsData = await apiRequest(url);
      
      const relationships = relationshipsData?.data?.supplier_products || [];
      // Use provided catMap or fall back to state categoryMap
      const mapToUse = catMap || categoryMap;
      const enrichedRelationships = relationships.map((rel: any) => ({
        ...rel,
        category_name: mapToUse[rel.category_id] || 'Sin categoría'
      }));

      if (isInitialLoad) {
        setRelationships(enrichedRelationships);
      } else {
        // Deduplicate to prevent duplicate keys
        setRelationships(prev => {
          const existingIds = new Set(prev.map(r => r.id));
          const newRelationships = enrichedRelationships.filter((r: SupplierProduct) => !existingIds.has(r.id));
          return [...prev, ...newRelationships];
        });
      }

      setHasMore(relationships.length === PAGE_SIZE);
      setSkip(pageSkip + PAGE_SIZE);
    } catch (err: any) {
      console.error('Error fetching relationships page:', err);
      setHasMore(false);
      throw err;
    }
  }, [filterSupplier, searchTerm, categoryMap]);

  // Load more relationships (infinite scroll)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      await fetchRelationshipsPage(skip, false);
    } catch (err: any) {
      console.error('Error loading more relationships:', err);
      setError(err.message || 'Error al cargar más datos');
    } finally {
      setLoadingMore(false);
    }
  }, [skip, hasMore, loadingMore, fetchRelationshipsPage]);

  // Reset and reload when backend filters change (supplier filter and search term)
  useEffect(() => {
    // Skip if initial load hasn't completed yet
    if (!initialLoadComplete.current) return;
    
    setRelationships([]);
    setSkip(0);
    setHasMore(true);
    
    fetchRelationshipsPage(0, true).catch((err: any) => {
      console.error('Error reloading relationships:', err);
      setError(err.message || 'Error al recargar los datos');
    });
  }, [filterSupplier, searchTerm, fetchRelationshipsPage]); // Reset on supplier filter or search term change

  // Update category names when categoryMap changes
  useEffect(() => {
    if (Object.keys(categoryMap).length > 0 && relationships.length > 0) {
      setRelationships(prev => prev.map(rel => ({
        ...rel,
        category_name: categoryMap[rel.category_id || 0] || 'Sin categoría'
      })));
    }
  }, [categoryMap]);

  // Client-side filtering (only for filters not supported by backend)
  // Note: search and supplier filter are now handled by backend
  const filteredRelationships = relationships.filter(rel => {
    // Supplier filter is handled by backend, but we keep this for consistency
    const matchesSupplier = !filterSupplier || rel.supplier_id.toString() === filterSupplier;
    const matchesCategory = !filterCategory || rel.category_id?.toString() === filterCategory;
    const matchesCurrency = !filterCurrency || rel.currency === filterCurrency;
    
    // Price range filtering
    const matchesPriceRange = (() => {
      if (!filterPriceMin && !filterPriceMax) return true;
      if (rel.cost === null || rel.cost === undefined) return false;
      
      const price = Number(rel.cost);
      const minPrice = filterPriceMin ? Number(filterPriceMin) : 0;
      const maxPrice = filterPriceMax ? Number(filterPriceMax) : Infinity;
      
      return price >= minPrice && price <= maxPrice;
    })();
    
    return matchesSupplier && matchesCategory && matchesCurrency && matchesPriceRange;
  });

  // Sort the filtered relationships
  const sortedRelationships = [...filteredRelationships].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortBy) {
      case 'product_name':
        aValue = a.product_name || '';
        bValue = b.product_name || '';
        break;
      case 'supplier_name':
        aValue = a.supplier_name || '';
        bValue = b.supplier_name || '';
        break;
      case 'cost':
        aValue = a.cost || 0;
        bValue = b.cost || 0;
        break;
      case 'created_at':
        aValue = new Date(a.created_at);
        bValue = new Date(b.created_at);
        break;
      case 'last_updated':
        aValue = a.last_updated ? new Date(a.last_updated) : new Date(0);
        bValue = b.last_updated ? new Date(b.last_updated) : new Date(0);
        break;
      default:
        aValue = a.product_name || '';
        bValue = b.product_name || '';
    }
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleAddRelationship = () => {
    setShowAddDialog(true);
  };

  const handleEditRelationship = (relationshipId: number) => {
    navigate(`/supplier-products/edit/${relationshipId}`);
  };

  const handleProductClick = (supplierProductId: number) => {
    // Navigate to supplier-product edit page instead of old product detail page
    navigate(`/supplier-products/edit/${supplierProductId}`);
  };

  const handleSort = (field: 'product_name' | 'supplier_name' | 'cost' | 'created_at' | 'last_updated') => {
    if (sortBy === field) {
      // Toggle order if same field
      const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      updateSearchParams({ sortBy: field, sortOrder: newOrder });
    } else {
      // New field, start with asc
      updateSearchParams({ sortBy: field, sortOrder: 'asc' });
    }
  };

  // Infinite scroll sentinel ref
  const sentinelRef = useInfiniteScroll({
    hasMore,
    loading: loadingMore,
    onLoadMore: loadMore,
  });

  if (loading) {
    return (
      <div className="w-screen min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 overflow-x-hidden">
        <div className="container mx-auto max-w-7xl px-4 pt-20 pb-8">
          <div className="mb-8">
            <div className="h-10 w-64 bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="h-6 w-96 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <Card className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-screen min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 overflow-x-hidden">
        <div className="container mx-auto max-w-7xl px-4 pt-20 pb-8">
          <Card className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error al Cargar Datos</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button 
              onClick={() => {
                setRelationships([]);
                setSkip(0);
                setHasMore(true);
                setError(null);
                fetchRelationshipsPage(0, true).catch((err: any) => {
                  console.error('Error retrying fetch:', err);
                  setError(err.message || 'Error al cargar los datos');
                });
              }} 
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Intentar de Nuevo
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 overflow-x-hidden">
      <div className="container mx-auto max-w-7xl px-4 pt-20 pb-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent mb-2">
                Productos
              </h1>
              <p className="text-gray-600">Gestiona productos y sus relaciones con proveedores, precios y stock</p>
            </div>
          </div>

          {/* Search and Filters */}
          <Card className="p-4 mb-6">
            {/* Main Search Bar and Add Button */}
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Buscar
                </label>
                <Input
                  placeholder="Producto, proveedor o SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-base"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleAddRelationship}
                  className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap px-4 py-2"
                >
                  <svg className="w-4 h-4 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Agregar Nuevo Producto</span>
                </Button>
              </div>
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proveedor
                </label>
                <select
                  value={filterSupplier}
                  onChange={(e) => setFilterSupplier(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none bg-white"
                >
                  <option value="">Todos</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none bg-white"
                >
                  <option value="">Todas</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Moneda
                </label>
                <select
                  value={filterCurrency}
                  onChange={(e) => setFilterCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none bg-white"
                >
                  <option value="">Todas</option>
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rango de Precio
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filterPriceMin}
                    onChange={(e) => setFilterPriceMin(e.target.value)}
                    className="w-full"
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filterPriceMax}
                    onChange={(e) => setFilterPriceMax(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Sorting Controls */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
                <label className="text-sm font-medium text-gray-700">Ordenar por:</label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSort('product_name')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    sortBy === 'product_name'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Nombre
                  {sortBy === 'product_name' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortOrder === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => handleSort('cost')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    sortBy === 'cost'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Precio
                  {sortBy === 'cost' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortOrder === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => handleSort('created_at')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    sortBy === 'created_at'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Creado
                  {sortBy === 'created_at' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortOrder === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => handleSort('last_updated')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    sortBy === 'last_updated'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Actualizado
                  {sortBy === 'last_updated' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortOrder === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {sortedRelationships.length} resultado{sortedRelationships.length !== 1 ? 's' : ''}
            </div>
          </div>
        </Card>

        {/* Results */}
        <Card className="shadow-lg border-0 rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-blue-100 p-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Productos con Proveedores
              <span className="ml-2 text-sm font-normal text-gray-500">({sortedRelationships.length})</span>
            </h3>
          </div>

          <div className="p-4">
            {sortedRelationships.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="flex flex-col items-center justify-center">
                  <div className="w-16 h-16 mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <p className="font-medium">
                    {searchTerm || filterSupplier ? 'No se encontraron relaciones' : 'No hay relaciones configuradas'}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    {searchTerm || filterSupplier 
                      ? 'Intenta ajustar los filtros de búsqueda' 
                      : 'Comienza agregando una relación proveedor-producto'
                    }
                  </p>
                  {!searchTerm && !filterSupplier && (
                    <Button 
                      onClick={handleAddRelationship}
                      className="mt-4 bg-green-600 hover:bg-green-700 text-white"
                    >
                      Agregar Primer Producto
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {sortedRelationships.map((relationship) => (
                    <div 
                      key={relationship.id}
                      onClick={() => handleProductClick(relationship.id)}
                      className="p-5 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-gradient-to-r hover:from-blue-50/40 hover:to-cyan-50/40 transition-all duration-200 cursor-pointer group shadow-sm hover:shadow-md"
                    >
                      {/* Header: Title and Status */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                              {relationship.product_name}
                            </h4>
                          </div>
                          {/* Description with ellipsis */}
                          {relationship.description && (
                            <p className="text-sm text-gray-600 mb-2 overflow-hidden text-ellipsis" style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              maxHeight: '2.5rem',
                              lineHeight: '1.25rem'
                            }}>
                              {relationship.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full font-medium">
                              {relationship.supplier_name}
                            </span>
                            <span className="bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full font-medium">
                              {relationship.category_name}
                            </span>
                            {relationship.supplier_sku && (
                              <span className="bg-gray-100 text-gray-800 px-2.5 py-1 rounded-full font-medium">
                                SKU Prov: {relationship.supplier_sku}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="ml-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                      
                      {/* Main Info Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <span className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Precio/Costo</span>
                          <div className="font-semibold text-gray-900 text-lg">
                            {relationship.cost !== null && relationship.cost !== undefined ? formatCurrency(relationship.cost, relationship.currency) : 'No definido'}
                          </div>
                          {relationship.currency && (
                            <div className="text-xs text-gray-500 mt-1">
                              {relationship.currency}
                            </div>
                          )}
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <span className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Stock</span>
                          <div className={`font-semibold text-lg ${
                            (relationship.stock || 0) > 50 ? 'text-green-600' : 
                            (relationship.stock || 0) > 10 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {relationship.stock || 0}
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                          <span className="text-xs text-gray-500 uppercase tracking-wide block mb-0.5 sm:mb-1">Unidad</span>
                          <div className="font-semibold text-gray-900 text-sm sm:text-base">
                            {relationship.unit || 'N/A'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Date Information - Compact */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="font-medium">Creado:</span>
                          <span>{formatDate(relationship.created_at, 'DD MMM YYYY HH:mm')}</span>
                        </div>
                        {relationship.last_updated && (
                          <div className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span className="font-medium">Actualizado:</span>
                            <span>{formatDate(relationship.last_updated, 'DD MMM YYYY HH:mm')}</span>
                          </div>
                        )}
                      </div>
                      
                      {relationship.notes && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <span className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Notas</span>
                          <p className="text-sm text-gray-700">{relationship.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Loading more indicator */}
                {loadingMore && (
                  <div className="flex items-center justify-center py-6">
                    <div className="flex items-center space-x-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="text-sm text-gray-600 font-medium">Cargando más productos...</span>
                    </div>
                  </div>
                )}

                {/* End of results indicator */}
                {!hasMore && relationships.length > 0 && (
                  <div className="text-center py-6">
                    <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>No hay más productos para mostrar</span>
                    </div>
                  </div>
                )}

                {/* Infinite scroll sentinel */}
                <div ref={sentinelRef} style={{ height: '1px' }} />
              </>
            )}
          </div>
        </Card>

        {/* Add Dialog would go here - simplified for now */}
        {showAddDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Agregar Nuevo Producto</h3>
              <p className="text-gray-600 mb-4">
                Para agregar un nuevo producto, utiliza el formulario de edición completo.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowAddDialog(false);
                    navigate('/supplier-product-admin/new');
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white flex-1"
                >
                  Ir al Formulario
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierProductManagementPage;
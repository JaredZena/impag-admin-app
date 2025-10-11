import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AddProductForm from './AddProductForm';
import { apiRequest } from '@/utils/api';
import { formatReadableDate } from '@/utils/dateUtils';

interface SupplierDetail {
  id: number;
  name: string;
  common_name?: string;
  description?: string;
  website_url?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: string;
  last_updated: string;
}

interface SupplierProduct {
  id: number;
  name: string;
  sku: string;
  category: string;
  unit: string;
  price: number;
  currency?: string; // Currency of the price (MXN or USD)
  lead_time_days: number;
  is_active: boolean;
  created_at?: string;
  last_updated: string;
}

const SupplierDetailPage: React.FC = () => {
  const { supplierId } = useParams<{ supplierId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<{[key: number]: string}>({});
  const [navigationInfo, setNavigationInfo] = useState<{
    hasPrevious: boolean;
    hasNext: boolean;
    previousId?: number;
    nextId?: number;
  }>({ hasPrevious: false, hasNext: false });
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  
  // Sorting state - initialize from URL parameters
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'created' | 'updated' | 'price'>(
    (searchParams.get('sort_by') as 'name' | 'category' | 'created' | 'updated' | 'price') || 'name'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    (searchParams.get('sort_order') as 'asc' | 'desc') || 'asc'
  );

  // Update URL parameters when sorting changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set('sort_by', sortBy);
    params.set('sort_order', sortOrder);
    setSearchParams(params, { replace: true });
  }, [sortBy, sortOrder]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch categories first
        let categoriesMap: {[key: number]: string} = {};
        try {
          const categoriesData = await apiRequest('/categories');
          categoriesMap = (categoriesData.data || []).reduce((acc: any, cat: any) => {
            acc[cat.id] = cat.name;
            return acc;
          }, {});
          setCategories(categoriesMap);
        } catch (catError) {
          console.warn('Error fetching categories:', catError);
        }

        // Fetch supplier details
        let supplierData;
        try {
          supplierData = await apiRequest(`/suppliers/${supplierId}`);
        } catch (supplierError) {
          console.warn('Supplier endpoint not available, using mock data');
          // Create mock supplier data based on the supplier ID
          supplierData = {
            data: {
              id: parseInt(supplierId!),
              name: `Proveedor ${supplierId}`,
              common_name: `Nombre Común ${supplierId}`,
              description: `Descripción detallada del proveedor ${supplierId}. Este es un proveedor confiable con experiencia en el sector.`,
              website_url: `https://proveedor${supplierId}.com`,
              contact_name: 'Persona de Contacto',
              email: `proveedor${supplierId}@email.com`,
              phone: '+1 234 567 8900',
              address: 'Dirección del Proveedor',
              created_at: new Date().toISOString(),
              last_updated: new Date().toISOString(),
            }
          };
        }
        
        if (supplierData.data) {
          setSupplier(supplierData.data);
        }

        // Fetch navigation info (previous/next suppliers)
        try {
          const allSuppliersData = await apiRequest('/suppliers?limit=1000');
          const allSuppliers = allSuppliersData.data || [];
          const currentIndex = allSuppliers.findIndex((s: any) => s.id === parseInt(supplierId!));
          
          if (currentIndex !== -1) {
            setNavigationInfo({
              hasPrevious: currentIndex > 0,
              hasNext: currentIndex < allSuppliers.length - 1,
              previousId: currentIndex > 0 ? allSuppliers[currentIndex - 1].id : undefined,
              nextId: currentIndex < allSuppliers.length - 1 ? allSuppliers[currentIndex + 1].id : undefined,
            });
          }
        } catch (navError) {
          console.error('Could not fetch navigation info:', navError);
        }

        // Fetch supplier products using the efficient endpoint
        try {
          const supplierProductsData = await apiRequest(`/suppliers/${supplierId}/products`);
          console.log('Supplier products data:', supplierProductsData);
          
          if (supplierProductsData.success && supplierProductsData.data && supplierProductsData.data.length > 0) {
            const transformedProducts = supplierProductsData.data.map((productData: any) => ({
              id: productData.product_id,
              name: productData.product_name || 'N/A',
              sku: productData.sku || productData.base_sku || 'N/A',
              category: categoriesMap[productData.category_id] || 'Sin categoría',
              unit: productData.unit || 'N/A',
              price: productData.cost || 0,
              currency: productData.currency || 'MXN', // Include currency from supplier-product relationship
              lead_time_days: productData.lead_time_days || 0,
              is_active: productData.supplier_is_active !== false,
              created_at: productData.created_at, // Use the alias from backend
              last_updated: productData.last_updated || productData.created_at // Use the alias from backend
            }));
            
            setProducts(transformedProducts);
          } else {
            setProducts([]);
          }
        } catch (productsError) {
          console.warn('Error fetching supplier products:', productsError);
          // Fallback to base products if SupplierProduct endpoint fails
          try {
            const productsData = await apiRequest(`/products?supplier_id=${supplierId}`);
            const transformedProducts = (productsData.data || []).map((product: any) => ({
              id: product.id,
              name: product.name,
              sku: product.sku || product.base_sku || 'N/A',
              category: categoriesMap[product.category_id] || 'Sin categoría',
              unit: product.unit || 'N/A',
              price: product.price || null,
              lead_time_days: null,
              is_active: product.is_active || false,
              last_updated: product.last_updated || product.created_at
            }));
            setProducts(transformedProducts);
          } catch (fallbackError) {
            console.error('Error fetching fallback products:', fallbackError);
            setProducts([]);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    
    if (supplierId) fetchData();
  }, [supplierId]);

  const handlePreviousSupplier = () => {
    if (navigationInfo.previousId) {
      navigate(`/supplier-admin/${navigationInfo.previousId}`);
    }
  };

  const handleNextSupplier = () => {
    if (navigationInfo.nextId) {
      navigate(`/supplier-admin/${navigationInfo.nextId}`);
    }
  };

  const refreshProducts = async () => {
    try {
      console.log(`Refreshing products for supplier ${supplierId}`);
      
      // Fetch categories first
      const categoriesData = await apiRequest('/categories');
      const categoriesMap = (categoriesData.data || []).reduce((acc: any, cat: any) => {
        acc[cat.id] = cat.name;
        return acc;
      }, {});
      setCategories(categoriesMap);

      // Fetch supplier products using the efficient endpoint
      try {
        const supplierProductsData = await apiRequest(`/suppliers/${supplierId}/products`);
        console.log('Supplier products data:', supplierProductsData);
        
        if (supplierProductsData.success && supplierProductsData.data && supplierProductsData.data.length > 0) {
          const transformedProducts = supplierProductsData.data.map((productData: any) => ({
            id: productData.product_id,
            name: productData.product_name || 'N/A',
            sku: productData.sku || productData.base_sku || 'N/A',
            category: categoriesMap[productData.category_id] || 'Sin categoría',
            unit: productData.unit || 'N/A',
            price: productData.cost || 0,
            currency: productData.currency || 'MXN',
            lead_time_days: productData.lead_time_days || 0,
            is_active: productData.supplier_is_active !== false,
            created_at: productData.supplier_relationship_created_at,
            last_updated: productData.supplier_relationship_last_updated || productData.supplier_relationship_created_at
          }));
          
          setProducts(transformedProducts);
        } else {
          setProducts([]);
        }
      } catch (productsError) {
        console.warn('Error fetching supplier products:', productsError);
        setProducts([]);
      }
    } catch (err: any) {
      console.error('Error refreshing products:', err);
    }
  };

  const handleAddProductSuccess = () => {
    setShowAddProductForm(false);
    refreshProducts();
  };

  // Handle sorting
  const handleSort = (field: 'name' | 'category' | 'created' | 'updated' | 'price') => {
    if (sortBy === field) {
      // Toggle sort order if clicking the same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Sort products based on current sorting state
  const sortedProducts = [...products].sort((a, b) => {
    let compareValue = 0;

    switch (sortBy) {
      case 'name':
        compareValue = a.name.localeCompare(b.name);
        break;
      case 'category':
        compareValue = a.category.localeCompare(b.category);
        break;
      case 'price':
        compareValue = (a.price || 0) - (b.price || 0);
        break;
      case 'created':
        // Sort by created_at if available, otherwise use last_updated
        const aCreated = a.created_at || a.last_updated;
        const bCreated = b.created_at || b.last_updated;
        compareValue = new Date(aCreated).getTime() - new Date(bCreated).getTime();
        break;
      case 'updated':
        compareValue = new Date(a.last_updated).getTime() - new Date(b.last_updated).getTime();
        break;
    }

    return sortOrder === 'asc' ? compareValue : -compareValue;
  });

  if (loading) {
    return (
      <div className="w-screen min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 overflow-x-hidden">
        <div className="container mx-auto max-w-7xl 2xl:max-w-screen-2xl px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 pt-20 pb-8">
          <div className="mb-4 sm:mb-6">
            <div className="h-8 sm:h-10 w-20 sm:w-24 bg-gray-200 rounded animate-pulse"></div>
          </div>
          
          <Card className="p-4 sm:p-6 md:p-8 mb-6 sm:mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 sm:h-4 w-16 sm:w-20 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-5 sm:h-6 w-24 sm:w-32 bg-gray-200 rounded animate-pulse"></div>
                </div>
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
        <div className="container mx-auto max-w-7xl 2xl:max-w-screen-2xl px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 pt-20 pb-8">
          
          <Card className="p-6 sm:p-8 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Error al Cargar Proveedor</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="bg-green-600 hover:bg-green-700 text-sm sm:text-base">
              Intentar de Nuevo
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 overflow-x-hidden">
      <div className="container mx-auto max-w-7xl 2xl:max-w-screen-2xl px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 pt-20 pb-8">

        {/* Supplier Name and ID - Left Aligned */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent mb-2">
            {supplier?.name || 'Detalles del Proveedor'}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">ID del Proveedor: {supplierId}</p>
          
          {/* Navigation and Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <Button 
                variant="outline" 
                onClick={handlePreviousSupplier}
                disabled={!navigationInfo.hasPrevious}
                className="flex items-center space-x-2 border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm w-full sm:w-auto"
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Proveedor Anterior</span>
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleNextSupplier}
                disabled={!navigationInfo.hasNext}
                className="flex items-center space-x-2 border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm w-full sm:w-auto"
              >
                <span>Siguiente Proveedor</span>
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button 
                variant="outline" 
                onClick={() => navigate(`/supplier-admin/edit/${supplierId}`)}
                className="border-green-200 text-green-700 hover:bg-green-50 text-sm w-full sm:w-auto"
              >
                Editar Proveedor
              </Button>
            </div>
          </div>
        </div>

        {supplier && (
          <>
            {/* Supplier Information Card */}
            <Card className="p-3 sm:p-4 md:p-6 mb-6 sm:mb-8 shadow-lg border-0 rounded-xl">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm sm:text-lg">Información del Proveedor</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Nombre</label>
                  <p className="text-sm sm:text-lg font-semibold text-gray-900 break-words">{supplier.name}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Nombre Común</label>
                  <p className="text-xs sm:text-sm text-gray-900">{supplier.common_name || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Persona de Contacto</label>
                  <p className="text-xs sm:text-sm text-gray-900">{supplier.contact_name || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Email</label>
                  <p className="text-xs sm:text-sm text-gray-900 break-all">{supplier.email || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Teléfono</label>
                  <p className="text-xs sm:text-sm text-gray-900">{supplier.phone || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Sitio Web</label>
                  <p className="text-xs sm:text-sm text-gray-900">
                    {supplier.website_url ? (
                      <a 
                        href={supplier.website_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline break-all"
                      >
                        {supplier.website_url}
                      </a>
                    ) : 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Dirección</label>
                  <p className="text-xs sm:text-sm text-gray-900">{supplier.address || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Creado</label>
                  <p className="text-xs sm:text-sm text-gray-900">
                    {new Date(supplier.created_at).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Última Actualización</label>
                  <p className="text-xs sm:text-sm text-gray-900">
                    {formatReadableDate(supplier.last_updated)}
                  </p>
                </div>
              </div>
              
              {/* Description Section - Full Width */}
              {supplier.description && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-medium text-gray-500">Descripción</label>
                    <p className="text-xs sm:text-sm text-gray-900 leading-relaxed">{supplier.description}</p>
                  </div>
                </div>
              )}
            </Card>

            {/* Products Supplied */}
            <Card className="shadow-lg border-0 rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-green-50 border-b border-green-100 p-3 sm:p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-4V8a1 1 0 00-1-1H7a1 1 0 00-1 1v1m0 4h.01" />
                    </svg>
                    <span className="text-sm sm:text-lg">Productos Suministrados</span>
                    <span className="ml-2 text-xs sm:text-sm font-normal text-gray-500">({products.length})</span>
                  </h3>
                  <Button 
                    onClick={() => setShowAddProductForm(!showAddProductForm)}
                    variant={showAddProductForm ? "outline" : "default"}
                    className={showAddProductForm ? "border-gray-300 text-gray-700 hover:bg-gray-50" : "bg-green-600 hover:bg-green-700 text-white"}
                    size="sm"
                  >
                    {showAddProductForm ? (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancelar
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Agregar Producto
                      </>
                    )}
                  </Button>
                </div>
                {products.length > 0 && products[0]?.price !== null && (
                  <div className="mt-2 text-xs sm:text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-2">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">Información específica del proveedor:</span>
                    </div>
                    <p className="mt-1 text-xs">Se muestran precios y tiempos de entrega específicos de este proveedor.</p>
                  </div>
                )}
                {products.length > 0 && products[0]?.price === null && (
                  <div className="mt-2 text-xs sm:text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">Información de productos base:</span>
                    </div>
                    <p className="mt-1 text-xs">Los precios y tiempos de entrega específicos del proveedor no están disponibles actualmente. Se muestra información del catálogo base.</p>
                  </div>
                )}
              </div>

              {/* Add Product Form */}
              {showAddProductForm && (
                <div className="p-3 sm:p-4 md:p-6 border-b border-gray-100">
                  <AddProductForm
                    supplierId={supplierId!}
                    onSuccess={handleAddProductSuccess}
                    onCancel={() => setShowAddProductForm(false)}
                  />
                </div>
              )}

              {/* Sorting Controls */}
              {products.length > 0 && (
                <div className="p-3 sm:p-4 border-b border-gray-100 bg-gray-50/30">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs sm:text-sm font-medium text-gray-600 flex items-center mr-2">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                      </svg>
                      Ordenar por:
                    </span>
                    <button
                      onClick={() => handleSort('name')}
                      className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                        sortBy === 'name'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      Nombre {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                    <button
                      onClick={() => handleSort('category')}
                      className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                        sortBy === 'category'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      Categoría {sortBy === 'category' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                    <button
                      onClick={() => handleSort('price')}
                      className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                        sortBy === 'price'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      Precio {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                    <button
                      onClick={() => handleSort('created')}
                      className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                        sortBy === 'created'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      Creado {sortBy === 'created' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                    <button
                      onClick={() => handleSort('updated')}
                      className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                        sortBy === 'updated'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      Actualizado {sortBy === 'updated' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                  </div>
                </div>
              )}
              
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Producto</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden sm:table-cell">SKU</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell">Categoría</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden lg:table-cell">Unidad</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Precio</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden xl:table-cell">Creado</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 sm:py-12 text-gray-500">
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 mb-3 sm:mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-4V8a1 1 0 00-1-1H7a1 1 0 00-1 1v1m0 4h.01" />
                              </svg>
                            </div>
                            <p className="font-medium text-sm sm:text-base">No se encontraron productos</p>
                            <p className="text-xs sm:text-sm text-gray-400 mt-1">Este proveedor no tiene productos registrados</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      sortedProducts.map((product, index) => (
                        <tr 
                          key={product.id} 
                          className={`border-b border-gray-100 hover:bg-gradient-to-r hover:from-green-50/30 hover:to-emerald-50/30 transition-all duration-200 cursor-pointer ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                          }`}
                          onClick={() => navigate(`/product-admin/${product.id}`)}
                        >
                          <td className="px-2 sm:px-4 py-3 sm:py-4">
                            <div className="font-medium text-gray-900 text-sm sm:text-base break-words">{product.name}</div>
                            <div className="sm:hidden text-xs text-gray-500 mt-1">
                              SKU: {product.sku}
                            </div>
                          </td>
                          <td className="hidden sm:table-cell px-2 sm:px-4 py-3 sm:py-4">
                            <span className="font-mono text-xs sm:text-sm text-gray-700 bg-gray-100 px-1 sm:px-2 py-1 rounded break-all">
                              {product.sku}
                            </span>
                          </td>
                          <td className="hidden md:table-cell px-2 sm:px-4 py-3 sm:py-4">
                            <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {product.category}
                            </span>
                          </td>
                          <td className="hidden lg:table-cell px-2 sm:px-4 py-3 sm:py-4">
                            <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                              {product.unit}
                            </span>
                          </td>
                          <td className="px-2 sm:px-4 py-3 sm:py-4">
                            <span className={`text-sm sm:text-base ${product.price !== null ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                              {product.price !== null ? `$${Number(product.price).toLocaleString()}` : 'N/A'}
                              {product.currency && (
                                <span className="ml-1 text-xs text-gray-600 font-medium">
                                  {product.currency}
                                </span>
                              )}
                            </span>
                          </td>

                          <td className="hidden xl:table-cell px-2 sm:px-4 py-3 sm:py-4">
                            <span className="text-xs sm:text-sm text-gray-700">
                              {product.created_at ? formatReadableDate(product.created_at) : 'N/A'}
                            </span>
                          </td>
                          <td className="px-2 sm:px-4 py-3 sm:py-4">
                            <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              product.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : product.price !== null 
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-blue-100 text-blue-800'
                            }`}>
                              {product.is_active ? 'Activo' : product.price !== null ? 'Inactivo' : 'En Catálogo'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default SupplierDetailPage; 
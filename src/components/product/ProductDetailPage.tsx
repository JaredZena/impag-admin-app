import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import SuppliersTable, { Supplier } from './SuppliersTable';
import AddSupplierModal from './AddSupplierModal';
import { apiRequest } from '@/utils/api';
import { formatReadableDate } from '@/utils/dateUtils';

interface Product {
  id: number;
  name: string;
  description: string;
  base_sku: string;
  category_id: number;
  category_name?: string;
  unit: string;
  package_size: number | null;
  iva: boolean;
  // New flattened fields
  sku: string;
  price: number | null;
  stock: number;
  specifications: any;
  default_margin: number | null;
  is_active: boolean;
  created_at: string;
  last_updated: string;
}

const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [editedProduct, setEditedProduct] = useState<Product | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [navigationInfo, setNavigationInfo] = useState<{
    hasPrevious: boolean;
    hasNext: boolean;
    previousId?: number;
    nextId?: number;
  }>({ hasPrevious: false, hasNext: false });
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch categories first
        const categoriesData = await apiRequest('/categories');
        setCategories(categoriesData.data || []);

        // Fetch product details
        const productData = await apiRequest(`/products/${productId}`);
        if (productData.data) {
          const category = categoriesData.data?.find((c: any) => c.id === productData.data.category_id);
          const productWithCategory = {
            ...productData.data,
            category_name: category?.name || 'Unknown Category'
          };
          setProduct(productWithCategory);
          setEditedProduct(productWithCategory);
        }

        // Simple navigation: just check if prev/next IDs exist
        try {
          const currentId = parseInt(productId!);
          const [prevCheck, nextCheck] = await Promise.all([
            apiRequest(`/products/${currentId - 1}`).catch(() => null),
            apiRequest(`/products/${currentId + 1}`).catch(() => null)
          ]);
          
          setNavigationInfo({
            hasPrevious: prevCheck?.success === true,
            hasNext: nextCheck?.success === true,
            previousId: prevCheck?.success ? currentId - 1 : undefined,
            nextId: nextCheck?.success ? currentId + 1 : undefined,
          });
        } catch (navError) {
          setNavigationInfo({ hasPrevious: false, hasNext: false });
        }

        // Fetch suppliers through supplier-product relationships
        try {
          const productSupplierProducts = await apiRequest(`/products/${productId}/supplier-products`);
          
          if (productSupplierProducts.length === 0) {
            setSuppliers([]);
            return;
          }
          
          // Get supplier details for each relationship
          const supplierPromises = productSupplierProducts.map((sp: any) =>
            apiRequest(`/suppliers/${sp.supplier_id}`)
          );
          
          const supplierResponses = await Promise.all(supplierPromises);
          
          // Transform the data to include both supplier and supplier-product info
          const transformedSuppliers = productSupplierProducts.map((sp: any, index: number) => {
            const supplierData = supplierResponses[index];
            const supplier = supplierData?.data;
            
            if (!supplier) return null;
            
            return {
              id: supplier.id,
              name: supplier.name || 'Proveedor Desconocido',
              price: sp.cost || 0,
              currency: sp.currency || 'MXN', // Include currency from supplier-product relationship
              shipping_cost: sp.shipping_cost || null,
              contact_name: supplier.contact_name || null,
              phone: supplier.phone || null,
              website_url: supplier.website_url || null,
              address: supplier.address || null,
              last_updated: sp.last_updated || sp.created_at || null,
              is_active: sp.is_active !== false,
              supplier_product_id: sp.id, // Add the supplier-product relationship ID
            };
          }).filter(Boolean);
          
          setSuppliers(transformedSuppliers);
        } catch (suppliersError: any) {
          setSuppliers([]);
        }
      } catch (err: any) {
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    if (productId) fetchData();
  }, [productId]);

  const handleBack = () => {
    navigate('/product-admin');
  };

  const handlePreviousProduct = () => {
    if (navigationInfo.previousId) {
      navigate(`/product-admin/${navigationInfo.previousId}`);
    }
  };

  const handleNextProduct = () => {
    if (navigationInfo.nextId) {
      navigate(`/product-admin/${navigationInfo.nextId}`);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedProduct(product);
  };

  const handleSave = async () => {
    if (!editedProduct) {
      return;
    }
    
    setSaving(true);
    try {
      // Ensure data matches backend expectations
      const updateData = {
        name: editedProduct.name,
        description: editedProduct.description || null,
        category_id: editedProduct.category_id,
        base_sku: editedProduct.base_sku, // Include base_sku
        unit: editedProduct.unit, // Should be enum value like "PIEZA", "KG", etc.
        package_size: editedProduct.package_size,
        iva: editedProduct.iva,
        // New flattened fields
        sku: editedProduct.sku,
        price: editedProduct.price,
        stock: editedProduct.stock,
        specifications: editedProduct.specifications,
        default_margin: editedProduct.default_margin,
        is_active: editedProduct.is_active,
      };
      
      console.log('Update data to send:', updateData);
      console.log(`Making PUT request to /products/${productId}`);
      
      const updateResponse = await apiRequest(`/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
      console.log('Update response:', updateResponse);
      
      // Check if the response indicates success
      if (updateResponse.success === false) {
        throw new Error(updateResponse.error || 'Failed to update product');
      }
      
      // Refresh product data
      console.log('Refreshing product data...');
      const productData = await apiRequest(`/products/${productId}`);
      console.log('Refreshed product data:', productData);
      
      if (productData.success === false) {
        throw new Error(productData.error || 'Failed to fetch updated product');
      }
      
      const category = categories.find(c => c.id === productData.data.category_id);
      const updatedProduct = {
        ...productData.data,
        category_name: category?.name || 'Unknown Category'
      };
      
      console.log('Final updated product:', updatedProduct);
      
      setProduct(updatedProduct);
      setEditedProduct(updatedProduct);
      setIsEditing(false);
      setSaveSuccess(true); // Set success state
      
      console.log('Save completed successfully');
      
      // Clear any previous errors
      setError(null);
      
    } catch (err: any) {
      console.error('Error during save:', err);
      console.error('Error message:', err.message);
      console.error('Error details:', err);
      
      // Set a more descriptive error message
      let errorMessage = 'Error al actualizar el producto';
      if (err.message) {
        if (err.message.includes('401') || err.message.includes('Authentication')) {
          errorMessage = 'Error de autenticación. Por favor, inicia sesión nuevamente.';
        } else if (err.message.includes('400')) {
          errorMessage = 'Datos inválidos. Verifica que todos los campos estén correctos.';
        } else if (err.message.includes('404')) {
          errorMessage = 'Producto no encontrado.';
        } else {
          errorMessage = `Error: ${err.message}`;
        }
      }
      
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Clear success message after 3 seconds
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  const handleInputChange = (field: string, value: any) => {
    if (!editedProduct) return;
    setEditedProduct({
      ...editedProduct,
      [field]: value
    });
  };

  const refreshSuppliers = async () => {
    try {
      console.log(`Refreshing suppliers for product ${productId}`);
      const productSupplierProducts = await apiRequest(`/products/${productId}/supplier-products`);
      
      if (productSupplierProducts.length === 0) {
        setSuppliers([]);
        return;
      }
      
      // Get supplier details for each relationship
      const supplierPromises = productSupplierProducts.map((sp: any) =>
        apiRequest(`/suppliers/${sp.supplier_id}`)
      );
      
      const supplierResponses = await Promise.all(supplierPromises);
      
      // Transform the data to include both supplier and supplier-product info
      const transformedSuppliers = productSupplierProducts.map((sp: any, index: number) => {
        const supplierData = supplierResponses[index];
        const supplier = supplierData?.data;
        
        if (!supplier) return null;
        
        return {
          id: supplier.id,
          name: supplier.name || 'Proveedor Desconocido',
          price: sp.cost || 0,
          shipping_cost: sp.shipping_cost || null,
          contact_name: supplier.contact_name || null,
          phone: supplier.phone || null,
          website_url: supplier.website_url || null,
          address: supplier.address || null,
          last_updated: sp.last_updated || sp.created_at || null,
          is_active: sp.is_active !== false,
          supplier_product_id: sp.id, // Add the supplier-product relationship ID
        };
      }).filter(Boolean);
      
      setSuppliers(transformedSuppliers);
    } catch (err: any) {
      console.error('Error refreshing suppliers:', err);
    }
  };

  const handleRemoveSupplier = async (supplierProductId: string | number) => {
    if (!confirm('¿Estás seguro de que quieres remover este proveedor del producto?')) {
      return;
    }

    try {
      await apiRequest(`/products/supplier-product/${supplierProductId}/archive`, {
        method: 'PATCH'
      });
      
      // Refresh the suppliers list
      await refreshSuppliers();
    } catch (err: any) {
      console.error('Error removing supplier:', err);
      alert('Error al remover proveedor: ' + (err.message || 'Error desconocido'));
    }
  };

  if (loading) {
    return (
      <div className="w-screen min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 overflow-x-hidden">
        <div className="container mx-auto max-w-7xl 2xl:max-w-screen-2xl px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 pt-20 pb-8">
          {/* Back Button Skeleton */}
          <div className="mb-4 sm:mb-6">
            <div className="h-8 sm:h-10 w-28 sm:w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>

          {/* Header Skeleton */}
          <div className="mb-6 sm:mb-8">
            <div className="h-8 sm:h-10 w-72 sm:w-80 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-5 sm:h-6 w-40 sm:w-48 bg-gray-200 rounded animate-pulse mb-3 sm:mb-4"></div>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-8 sm:h-10 w-28 sm:w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-8 sm:h-10 w-28 sm:w-32 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="flex gap-2 sm:gap-3">
                <div className="h-8 sm:h-10 w-24 sm:w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-8 sm:h-10 w-24 sm:w-32 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
          
          {/* Product Information Card Skeleton */}
          <Card className="p-3 sm:p-4 md:p-6 mb-6 sm:mb-8 shadow-lg border-0 rounded-xl">
            <div className="h-6 sm:h-8 w-48 sm:w-64 bg-gray-200 rounded animate-pulse mb-4 sm:mb-6"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 sm:h-4 w-16 sm:w-20 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-5 sm:h-6 w-24 sm:w-32 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
              <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4 2xl:col-span-5 space-y-2">
                <div className="h-3 sm:h-4 w-16 sm:w-20 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-16 sm:h-20 w-full bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </Card>
          
          {/* Suppliers Table Skeleton */}
          <Card className="shadow-lg border-0 rounded-xl">
            <div className="p-3 sm:p-4 md:p-6">
              <div className="h-5 sm:h-6 w-24 sm:w-32 bg-gray-200 rounded animate-pulse mb-3 sm:mb-4"></div>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 sm:h-20 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-screen min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 overflow-x-hidden">
        <div className="container mx-auto max-w-7xl 2xl:max-w-screen-2xl px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 pt-20 pb-8">
          
          <Card className="p-6 sm:p-8 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Error al Cargar Producto</h2>
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
    <div className="w-screen min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 overflow-x-hidden">
      <div className="container mx-auto max-w-7xl 2xl:max-w-screen-2xl px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 py-4 sm:py-6 lg:py-8">

        {/* Product Name and ID - Left Aligned */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent mb-2">
            {product?.name || 'Detalles del Producto'}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">ID del Producto: {productId}</p>
          
          {/* Navigation and Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <Button 
                variant="outline" 
                onClick={handlePreviousProduct}
                disabled={!navigationInfo.hasPrevious}
                className="flex items-center space-x-2 border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm w-full sm:w-auto"
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Producto Anterior</span>
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleNextProduct}
                disabled={!navigationInfo.hasNext}
                className="flex items-center space-x-2 border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm w-full sm:w-auto"
              >
                <span>Producto Siguiente</span>
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              {isEditing ? (
                <>
                  <Button 
                    variant="outline" 
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 text-sm w-full sm:w-auto"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm w-full sm:w-auto"
                  >
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => navigate(`/product-admin/edit/${productId}`)}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm w-full sm:w-auto"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 0 002-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar Producto
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Success notification */}
                        {saveSuccess && (
          <div className="mb-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-800 font-medium">Cambios guardados exitosamente</span>
            </div>
          </div>
        )}



        {product && editedProduct && (
          <>
            {/* Product Information Card */}
            <Card className="p-3 sm:p-4 md:p-6 mb-6 sm:mb-8 shadow-lg border-0 rounded-xl">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm sm:text-lg">Información del Producto</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Nombre</label>
                  {isEditing ? (
                    <Input
                      value={editedProduct.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="border-gray-300 focus:border-green-500 focus:ring-green-500 text-sm"
                    />
                  ) : (
                    <p className="text-sm sm:text-lg font-semibold text-gray-900 break-words">{product.name}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-medium text-gray-500">SKU Base</label>
                  <span className="inline-block font-mono text-xs sm:text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded break-all">
                    {product.base_sku}
                  </span>
                </div>
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-medium text-gray-500">SKU Principal</label>
                  {isEditing ? (
                    <Input
                      value={editedProduct.sku}
                      onChange={(e) => handleInputChange('sku', e.target.value)}
                      className="border-gray-300 focus:border-green-500 focus:ring-green-500 text-sm font-mono"
                    />
                  ) : (
                    <span className="inline-block font-mono text-xs sm:text-sm text-gray-700 bg-blue-100 px-2 py-1 rounded break-all">
                      {product.sku}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Precio</label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={editedProduct.price || ''}
                      onChange={(e) => handleInputChange('price', e.target.value ? parseFloat(e.target.value) : null)}
                      className="border-gray-300 focus:border-green-500 focus:ring-green-500 text-sm"
                      placeholder="0.00"
                    />
                  ) : (
                    <p className="text-sm sm:text-lg font-semibold text-gray-900">
                      {product.price != null ? `$${Number(product.price).toLocaleString()}` : 'N/A'}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Stock</label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editedProduct.stock || 0}
                      onChange={(e) => handleInputChange('stock', e.target.value ? parseInt(e.target.value) : 0)}
                      className="border-gray-300 focus:border-green-500 focus:ring-green-500 text-sm"
                    />
                  ) : (
                    <div className="flex items-center">
                      <span className={`text-sm font-medium ${
                        (product.stock || 0) > 50 ? 'text-green-600' : 
                        (product.stock || 0) > 10 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {product.stock != null ? product.stock : 0}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">unidades</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Margen por Defecto</label>
                  {isEditing ? (
                    <div className="space-y-1">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={editedProduct.default_margin || 0.25}
                        onChange={(e) => handleInputChange('default_margin', e.target.value ? parseFloat(e.target.value) : null)}
                        className="border-gray-300 focus:border-green-500 focus:ring-green-500 text-sm"
                        placeholder="0.25"
                      />
                      <p className="text-xs text-gray-400">
                        Ej: 0.25 = 25% de margen
                      </p>
                      {/* Quick margin presets */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className="text-xs text-gray-500">Rápido:</span>
                        {[0.15, 0.20, 0.25, 0.30, 0.35, 0.40].map(margin => (
                          <button
                            key={margin}
                            type="button"
                            onClick={() => handleInputChange('default_margin', margin)}
                            className={`px-2 py-1 text-xs rounded border ${
                              editedProduct.default_margin === margin 
                                ? 'bg-green-500 text-white border-green-500' 
                                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                            }`}
                          >
                            {(margin * 100).toFixed(0)}%
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-blue-600">
                          {product.default_margin != null ? `${(product.default_margin * 100).toFixed(1)}%` : 'No establecido'}
                        </span>
                        {product.default_margin != null && (
                          <span className="text-xs text-gray-500 ml-1">
                            ({product.default_margin})
                          </span>
                        )}
                      </div>
                      {/* Quick edit button */}
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-xs text-green-600 hover:text-green-800 flex items-center"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editar
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Categoría</label>
                  {isEditing ? (
                    <select
                      value={editedProduct.category_id}
                      onChange={(e) => handleInputChange('category_id', parseInt(e.target.value))}
                      className="w-full px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 rounded-md shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none text-xs sm:text-sm bg-white text-gray-900"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-medium bg-green-100 text-green-800">
                      {product.category_name}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Unidad</label>
                  {isEditing ? (
                    <Input
                      value={editedProduct.unit}
                      onChange={(e) => handleInputChange('unit', e.target.value)}
                      className="border-gray-300 focus:border-green-500 focus:ring-green-500 text-sm"
                    />
                  ) : (
                    <p className="text-xs sm:text-sm text-gray-900">{product.unit}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Tamaño del Paquete</label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editedProduct.package_size || ''}
                      onChange={(e) => handleInputChange('package_size', e.target.value ? parseInt(e.target.value) : null)}
                      className="border-gray-300 focus:border-green-500 focus:ring-green-500 text-sm"
                    />
                  ) : (
                    <p className="text-xs sm:text-sm text-gray-900">{product.package_size || 'N/A'}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Estado</label>
                  {isEditing ? (
                    <select
                      value={editedProduct.is_active ? 'true' : 'false'}
                      onChange={(e) => handleInputChange('is_active', e.target.value === 'true')}
                      className="w-full px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 rounded-md shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none text-xs sm:text-sm bg-white text-gray-900"
                    >
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      product.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {product.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Margen por Defecto (%)</label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={editedProduct.default_margin != null ? (editedProduct.default_margin * 100).toFixed(2) : ''}
                      onChange={(e) => handleInputChange('default_margin', e.target.value ? parseFloat(e.target.value) / 100 : null)}
                      className="border-gray-300 focus:border-green-500 focus:ring-green-500 text-sm"
                      placeholder="25.00"
                    />
                  ) : (
                    <p className="text-xs sm:text-sm text-gray-900">
                      {product.default_margin != null ? `${(product.default_margin * 100).toFixed(2)}%` : 'N/A'}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-medium text-gray-500">IVA</label>
                  {isEditing ? (
                    <select
                      value={editedProduct.iva ? 'true' : 'false'}
                      onChange={(e) => handleInputChange('iva', e.target.value === 'true')}
                      className="w-full px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 rounded-md shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none text-xs sm:text-sm bg-white text-gray-900"
                    >
                      <option value="true">Sí</option>
                      <option value="false">No</option>
                    </select>
                  ) : (
                    <p className="text-xs sm:text-sm text-gray-900">{product.iva ? 'Sí' : 'No'}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Creado</label>
                  <p className="text-xs sm:text-sm text-gray-900">
                    {formatReadableDate(product.created_at)}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Última Actualización</label>
                  <p className="text-xs sm:text-sm text-gray-900">
                    {formatReadableDate(product.last_updated)}
                  </p>
                </div>
                {/* Description - Larger field */}
                <div className="space-y-1 sm:col-span-2 lg:col-span-3 xl:col-span-4 2xl:col-span-5">
                  <label className="text-xs sm:text-sm font-medium text-gray-500">Descripción</label>
                  {isEditing ? (
                    <textarea
                      value={editedProduct.description || ''}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={4}
                      className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none text-xs sm:text-sm bg-white text-gray-900 resize-none"
                      placeholder="Ingrese la descripción del producto..."
                    />
                  ) : (
                    <div className="bg-gray-50 rounded-md p-3 sm:p-4 min-h-[80px] sm:min-h-[100px]">
                      <p className="text-sm sm:text-base text-gray-900 leading-relaxed whitespace-pre-wrap break-words">
                        {product.description || 'Sin descripción disponible'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Specifications Card */}
            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <Card className="p-3 sm:p-4 md:p-6 mb-6 sm:mb-8 shadow-lg border-0 rounded-xl">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm sm:text-lg">Especificaciones Técnicas</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <label className="text-xs sm:text-sm font-medium text-gray-500 capitalize">
                        {key.replace(/[_-]/g, ' ')}
                      </label>
                      <div className="text-sm sm:text-base text-gray-900 break-words">
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Suppliers Section */}
            <div className="space-y-4">
              {/* Add Supplier Button */}
              <div className="flex justify-end">
                <Button 
                  onClick={() => setIsAddSupplierModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Agregar Nuevo Proveedor
                </Button>
              </div>
              
              {/* Suppliers Table */}
              <SuppliersTable suppliers={suppliers} onRemoveSupplier={handleRemoveSupplier} />
            </div>

            {/* Add Supplier Modal */}
            <AddSupplierModal
              isOpen={isAddSupplierModalOpen}
              onClose={() => setIsAddSupplierModalOpen(false)}
              onSuccess={refreshSuppliers}
              productId={productId!}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ProductDetailPage; 
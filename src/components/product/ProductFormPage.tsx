import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/utils/api';

interface ProductFormData {
  name: string;
  description: string;
  base_sku: string;
  sku: string;
  category_id: string;
  unit: string;
  package_size: string;
  price: string;
  stock: string;
  iva: boolean;
  is_active: boolean;
  specifications: Record<string, any>;
}

const initialFormData: ProductFormData = {
  name: '',
  description: '',
  base_sku: '',
  sku: '',
  category_id: '',
  unit: 'PIEZA',
  package_size: '',
  price: '',
  stock: '0',
  iva: true,
  is_active: true,
  specifications: {},
};

const ProductFormPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [errors, setErrors] = useState<Partial<ProductFormData>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [specifications, setSpecifications] = useState<Array<{key: string, value: string}>>([]);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const isEditing = productId !== 'new';

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiRequest('/categories');
        setCategories(response.data || []);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };

    fetchCategories();

    if (isEditing) {
      fetchProduct();
    } else {
      // Initialize with one empty specification row for new products
      setSpecifications([{ key: '', value: '' }]);
    }
  }, [productId, isEditing]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const response = await apiRequest(`/products/${productId}`);
      const product = response.data;
      
      setFormData({
        name: product.name || '',
        description: product.description || '',
        base_sku: product.base_sku || '',
        sku: product.sku || '',
        category_id: product.category_id?.toString() || '',
        unit: product.unit || 'PIEZA',
        package_size: product.package_size?.toString() || '',
        price: product.price?.toString() || '',
        stock: product.stock?.toString() || '0',
        iva: product.iva !== false,
        is_active: product.is_active !== false,
        specifications: product.specifications || {},
      });

      // Convert specifications object to key-value array for editing
      const specsArray = Object.entries(product.specifications || {}).map(([key, value]) => ({
        key,
        value: String(value)
      }));
      setSpecifications(specsArray.length > 0 ? specsArray : [{ key: '', value: '' }]);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el producto');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<ProductFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (!formData.sku.trim()) {
      newErrors.sku = 'El SKU es requerido';
    }

    if (!formData.category_id) {
      newErrors.category_id = 'La categoría es requerida';
    }

    if (formData.price && isNaN(parseFloat(formData.price))) {
      newErrors.price = 'El precio debe ser un número válido';
    }

    if (formData.stock && isNaN(parseInt(formData.stock))) {
      newErrors.stock = 'El stock debe ser un número válido';
    }

    // Validate specifications
    for (const spec of specifications) {
      if (spec.key.trim() && !spec.value.trim()) {
        setError('Todas las especificaciones con clave deben tener un valor');
        return false;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof ProductFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Convert specifications array to object
      let specificationsObj: Record<string, any> = {};
      for (const spec of specifications) {
        if (spec.key.trim() && spec.value.trim()) {
          specificationsObj[spec.key.trim()] = spec.value.trim();
        }
      }

      // Prepare data
      const submitData = {
        name: formData.name,
        description: formData.description || null,
        base_sku: formData.base_sku || null,
        sku: formData.sku,
        category_id: parseInt(formData.category_id),
        unit: formData.unit,
        package_size: formData.package_size ? parseInt(formData.package_size) : null,
        price: formData.price ? parseFloat(formData.price) : null,
        stock: formData.stock ? parseInt(formData.stock) : 0,
        iva: formData.iva,
        is_active: formData.is_active,
        specifications: specificationsObj,
      };

      if (isEditing) {
        await apiRequest(`/products/${productId}`, {
          method: 'PUT',
          body: JSON.stringify(submitData),
        });
      } else {
        await apiRequest('/products', {
          method: 'POST',
          body: JSON.stringify(submitData),
        });
      }

      // Navigate back to product list or detail page
      if (isEditing) {
        navigate(`/product-admin/${productId}`);
      } else {
        navigate('/product-admin');
      }
    } catch (err: any) {
      setError(err.message || 'Error al guardar el producto');
      console.error('Error saving product:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isEditing) {
      navigate(`/product-admin/${productId}`);
    } else {
      navigate('/product-admin');
    }
  };

  const handleArchiveProduct = async () => {
    if (!isEditing || !productId) return;
    
    setArchiving(true);
    setError(null);

    try {
      await apiRequest(`/products/${productId}/archive`, {
        method: 'PATCH',
      });

      // Navigate back to product list after successful archive
      navigate('/product-admin', { 
        state: { message: 'Producto eliminado exitosamente' }
      });
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el producto');
      console.error('Error archiving product:', err);
    } finally {
      setArchiving(false);
      setShowArchiveDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="w-screen min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 overflow-x-hidden">
        <div className="container mx-auto max-w-4xl px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="mb-6 sm:mb-8">
            <div className="h-8 sm:h-10 w-48 bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <Card className="p-6 sm:p-8">
            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 overflow-x-hidden">
      <div className="container mx-auto max-w-4xl px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              className="border-green-200 text-green-700 hover:bg-green-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Regresar
            </Button>
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent">
            {isEditing ? 'Editar Producto' : 'Agregar Nuevo Producto'}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            {isEditing 
              ? 'Modifica la información del producto' 
              : 'Completa los datos del nuevo producto'
            }
          </p>
        </div>

        {/* Form */}
        <Card className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-red-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-700 text-sm">{error}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Producto *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Ej: Tornillo Phillips M6"
                  className={errors.name ? 'border-red-300' : ''}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              {/* SKU */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SKU *
                </label>
                <Input
                  value={formData.sku}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  placeholder="Ej: TORN-PHI-M6-001"
                  className={errors.sku ? 'border-red-300' : ''}
                />
                {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku}</p>}
              </div>

              {/* Base SKU */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SKU Base
                </label>
                <Input
                  value={formData.base_sku}
                  onChange={(e) => handleInputChange('base_sku', e.target.value)}
                  placeholder="Ej: TORN-PHI-M6"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría *
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => handleInputChange('category_id', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none bg-white ${errors.category_id ? 'border-red-300' : 'border-gray-300'}`}
                >
                  <option value="">Seleccionar categoría</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {errors.category_id && <p className="text-red-500 text-xs mt-1">{errors.category_id}</p>}
              </div>

              {/* Unit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unidad
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => handleInputChange('unit', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none bg-white"
                >
                  <option value="PIEZA">PIEZA</option>
                  <option value="KG">KG</option>
                  <option value="METRO">METRO</option>
                  <option value="ROLLO">ROLLO</option>
                </select>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Precio
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  placeholder="0.00"
                  className={errors.price ? 'border-red-300' : ''}
                />
                {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
              </div>

              {/* Stock */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stock
                </label>
                <Input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => handleInputChange('stock', e.target.value)}
                  placeholder="0"
                  className={errors.stock ? 'border-red-300' : ''}
                />
                {errors.stock && <p className="text-red-500 text-xs mt-1">{errors.stock}</p>}
              </div>

              {/* Package Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tamaño del Paquete
                </label>
                <Input
                  type="number"
                  value={formData.package_size}
                  onChange={(e) => handleInputChange('package_size', e.target.value)}
                  placeholder="Ej: 100"
                />
              </div>

              {/* Checkboxes */}
              <div className="md:col-span-2 flex gap-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.iva}
                    onChange={(e) => handleInputChange('iva', e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">IVA incluido</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => handleInputChange('is_active', e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Producto activo</span>
                </label>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none resize-none bg-white"
                  placeholder="Descripción detallada del producto..."
                />
              </div>

              {/* Specifications */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Especificaciones Técnicas
                </label>
                <div className="space-y-3">
                  {specifications.map((spec, index) => (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        value={spec.key}
                        onChange={(e) => {
                          const newSpecs = [...specifications];
                          newSpecs[index].key = e.target.value;
                          setSpecifications(newSpecs);
                        }}
                        placeholder="Ej: material, color, peso..."
                        className="bg-white"
                      />
                      <div className="flex gap-2">
                        <Input
                          value={spec.value}
                          onChange={(e) => {
                            const newSpecs = [...specifications];
                            newSpecs[index].value = e.target.value;
                            setSpecifications(newSpecs);
                          }}
                          placeholder="Ej: acero, azul, 2kg..."
                          className="bg-white flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newSpecs = specifications.filter((_, i) => i !== index);
                            setSpecifications(newSpecs.length > 0 ? newSpecs : [{ key: '', value: '' }]);
                          }}
                          className="px-3 border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSpecifications([...specifications, { key: '', value: '' }])}
                    className="w-full border-green-200 text-green-700 hover:bg-green-50"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Agregar Especificación
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Agrega características técnicas del producto como material, color, dimensiones, etc.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6 border-t">
              <Button
                type="submit"
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isEditing ? 'Actualizando...' : 'Creando...'}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {isEditing ? 'Actualizar Producto' : 'Crear Producto'}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={submitting}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </Button>
            </div>

            {/* Danger Zone - Only show when editing */}
            {isEditing && (
              <div className="pt-8 border-t border-red-200">
                <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                  <h3 className="text-lg font-semibold text-red-800 mb-2 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Zona de Peligro
                  </h3>
                  <p className="text-red-700 text-sm mb-4">
                    Esta acción eliminará permanentemente el producto del sistema. Los datos asociados se conservarán pero el producto no aparecerá en las listas.
                  </p>
                  <Button
                    type="button"
                    onClick={() => setShowArchiveDialog(true)}
                    disabled={submitting || archiving}
                    className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar Producto
                  </Button>
                </div>
              </div>
            )}

            {/* Archive Confirmation Dialog */}
            {showArchiveDialog && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Confirmar Eliminación
                    </h3>
                  </div>
                  
                  <p className="text-gray-600 mb-6">
                    ¿Estás seguro de que deseas eliminar este producto? Esta acción moverá el producto a un estado archivado y no aparecerá en las listas principales.
                  </p>
                  
                  <p className="text-sm text-gray-500 mb-6">
                    <strong>Producto:</strong> {formData.name}
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={handleArchiveProduct}
                      disabled={archiving}
                      className="bg-red-600 hover:bg-red-700 text-white flex-1"
                    >
                      {archiving ? (
                        <>
                          <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Eliminando...
                        </>
                      ) : (
                        'Sí, Eliminar Producto'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowArchiveDialog(false)}
                      disabled={archiving}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ProductFormPage; 
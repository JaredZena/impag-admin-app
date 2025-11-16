import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/utils/api';

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

interface SupplierProductFormData {
  supplier_id: number;
  product_id: number;  // Keep for now (legacy field)
  
  // Product fields (NEW - SupplierProduct is now standalone)
  name: string;
  description: string;
  base_sku: string;
  sku: string;
  category_id: number | null;
  unit: string;
  package_size: number | null;
  iva: boolean;
  specifications: any;
  default_margin: number | null;
  
  // Supplier-specific fields
  supplier_sku: string;
  cost: number | null;
  currency: string;
  stock: number;
  lead_time_days: number | null;
  shipping_method: string;
  shipping_cost_direct: number | null;
  shipping_stage1_cost: number | null;
  shipping_stage2_cost: number | null;
  shipping_stage3_cost: number | null;
  shipping_stage4_cost: number | null;
  shipping_notes: string;
  is_active: boolean;
  notes: string;
}

const SupplierProductFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [formData, setFormData] = useState<SupplierProductFormData>({
    supplier_id: 0,
    product_id: 0,  // Legacy field, will be removed in Phase 2
    
    // Product fields
    name: '',
    description: '',
    base_sku: '',
    sku: '',
    category_id: null,
    unit: 'PIEZA',
    package_size: null,
    iva: true,
    specifications: {},
    default_margin: null,
    
    // Supplier-specific fields
    supplier_sku: '',
    cost: null,
    currency: 'MXN',
    stock: 0,
    lead_time_days: null,
    shipping_method: 'DIRECT',
    shipping_cost_direct: null,
    shipping_stage1_cost: null,
    shipping_stage2_cost: null,
    shipping_stage3_cost: null,
    shipping_stage4_cost: null,
    shipping_notes: '',
    is_active: true,
    notes: ''
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch suppliers and categories
      const [suppliersData, categoriesData] = await Promise.all([
        apiRequest('/suppliers'),
        apiRequest('/categories')
      ]);

      setSuppliers(suppliersData.data || []);
      setCategories(categoriesData.data || []);

      // If editing, fetch the existing supplier product
      if (isEditing) {
        const relationshipData = await apiRequest(`/products/supplier-product/${id}`);
        if (relationshipData) {
          setFormData({
            supplier_id: relationshipData.supplier_id,
            product_id: relationshipData.product_id || 0,  // Legacy field
            
            // Product fields (NEW - from SupplierProduct directly)
            name: relationshipData.name || '',
            description: relationshipData.description || '',
            base_sku: relationshipData.base_sku || '',
            sku: relationshipData.sku || '',
            category_id: relationshipData.category_id,
            unit: relationshipData.unit || 'PIEZA',
            package_size: relationshipData.package_size,
            iva: relationshipData.iva !== undefined ? relationshipData.iva : true,
            specifications: relationshipData.specifications || {},
            default_margin: relationshipData.default_margin,
            
            // Supplier-specific fields
            supplier_sku: relationshipData.supplier_sku || '',
            cost: relationshipData.cost,
            currency: relationshipData.currency || 'MXN',
            stock: relationshipData.stock || 0,
            lead_time_days: relationshipData.lead_time_days,
            shipping_method: relationshipData.shipping_method || 'DIRECT',
            shipping_cost_direct: relationshipData.shipping_cost_direct,
            shipping_stage1_cost: relationshipData.shipping_stage1_cost,
            shipping_stage2_cost: relationshipData.shipping_stage2_cost,
            shipping_stage3_cost: relationshipData.shipping_stage3_cost,
            shipping_stage4_cost: relationshipData.shipping_stage4_cost,
            shipping_notes: relationshipData.shipping_notes || '',
            is_active: relationshipData.is_active,
            notes: relationshipData.notes || ''
          });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar los datos');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const submitData = {
        ...formData,
        cost: formData.cost === null || formData.cost === 0 ? null : formData.cost,
        lead_time_days: formData.lead_time_days === null || formData.lead_time_days === 0 ? null : formData.lead_time_days,
        shipping_cost_direct: formData.shipping_cost_direct === null || formData.shipping_cost_direct === 0 ? null : formData.shipping_cost_direct,
        shipping_stage1_cost: formData.shipping_stage1_cost === null || formData.shipping_stage1_cost === 0 ? null : formData.shipping_stage1_cost,
        shipping_stage2_cost: formData.shipping_stage2_cost === null || formData.shipping_stage2_cost === 0 ? null : formData.shipping_stage2_cost,
        shipping_stage3_cost: formData.shipping_stage3_cost === null || formData.shipping_stage3_cost === 0 ? null : formData.shipping_stage3_cost,
        shipping_stage4_cost: formData.shipping_stage4_cost === null || formData.shipping_stage4_cost === 0 ? null : formData.shipping_stage4_cost
      };

      if (isEditing) {
        await apiRequest(`/products/supplier-product/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData)
        });
      } else {
        await apiRequest('/products/supplier-product/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData)
        });
      }

      navigate('/supplier-products', {
        state: { 
          message: isEditing 
            ? 'Relación actualizada exitosamente' 
            : 'Relación creada exitosamente' 
        }
      });
    } catch (err: any) {
      setError(err.message || 'Error al guardar la relación');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof SupplierProductFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="w-screen min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 overflow-x-hidden">
        <div className="container mx-auto max-w-4xl px-4 pt-20 pb-8">
          <div className="mb-8">
            <div className="h-10 w-96 bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="h-6 w-64 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <Card className="p-6">
            <div className="space-y-6">
              {Array.from({ length: 6 }).map((_, i) => (
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
    <div className="w-screen min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 overflow-x-hidden">
      <div className="container mx-auto max-w-4xl px-4 pt-20 pb-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent mb-2">
              {isEditing ? 'Editar Relación' : 'Nueva Relación'} Proveedor-Producto
            </h1>
            <p className="text-gray-600">
              {isEditing ? 'Modifica la información de la relación' : 'Configura una nueva relación entre proveedor y producto'}
            </p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="mb-6 p-4 bg-red-50 border-red-200">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-700">{error}</span>
            </div>
          </Card>
        )}

        {/* Form */}
        <Card className="p-6 shadow-lg border-0 rounded-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Supplier Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Proveedor *
              </label>
              <select
                value={formData.supplier_id}
                onChange={async (e) => {
                  const newSupplierId = parseInt(e.target.value);
                  // Update local state
                  handleInputChange('supplier_id', newSupplierId);
                  
                  // Auto-save to database if editing
                  if (isEditing && id) {
                    try {
                      await apiRequest(`/products/supplier-product/${id}`, {
                        method: 'PUT',
                        body: JSON.stringify({ supplier_id: newSupplierId })
                      });
                    } catch (err) {
                      console.error('Error updating supplier:', err);
                      setError('Error al actualizar proveedor');
                    }
                  }
                }}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value={0}>Seleccionar proveedor...</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Information */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Producto</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Producto *
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                    placeholder="Nombre del producto"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SKU *
                  </label>
                  <Input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                    required
                    placeholder="SKU del producto"
                    className="w-full"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Descripción del producto..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoría
                  </label>
                  <select
                    value={formData.category_id || ''}
                    onChange={(e) => handleInputChange('category_id', e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="">Sin categoría</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unidad
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => handleInputChange('unit', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="PIEZA">Pieza</option>
                    <option value="KG">Kilogramo</option>
                    <option value="LITRO">Litro</option>
                    <option value="METRO">Metro</option>
                    <option value="CAJA">Caja</option>
                    <option value="PAQUETE">Paquete</option>
                    <option value="ROLLO">Rollo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    IVA
                  </label>
                  <select
                    value={formData.iva ? 'true' : 'false'}
                    onChange={(e) => handleInputChange('iva', e.target.value === 'true')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="true">Sí</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Supplier-Specific Information */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Proveedor</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SKU del Proveedor
                  </label>
                <Input
                  type="text"
                  value={formData.supplier_sku}
                  onChange={(e) => handleInputChange('supplier_sku', e.target.value)}
                  placeholder="SKU específico del proveedor"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Costo
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost || ''}
                  onChange={(e) => handleInputChange('cost', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="0.00"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Moneda
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="MXN">MXN (Pesos Mexicanos)</option>
                  <option value="USD">USD (Dólares)</option>
                </select>
              </div>
            </div>

            {/* Stock and Lead Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stock *
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => handleInputChange('stock', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  required
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tiempo de Entrega (días)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.lead_time_days || ''}
                  onChange={(e) => handleInputChange('lead_time_days', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="0"
                  className="w-full"
                />
              </div>
            </div>

            {/* Shipping Method Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Configuración de Envío</h3>
              
              {/* Shipping Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Método de Envío
                </label>
                <select
                  value={formData.shipping_method}
                  onChange={(e) => handleInputChange('shipping_method', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="DIRECT">Direct (Directo a local)</option>
                  <option value="OCURRE">Ocurre (Vía Durango City)</option>
                </select>
              </div>

              {/* Direct Shipping Cost */}
              {formData.shipping_method === 'DIRECT' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Costo de Envío Directo (por unidad)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.shipping_cost_direct || ''}
                    onChange={(e) => handleInputChange('shipping_cost_direct', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="0.00"
                    className="w-full"
                  />
                </div>
              )}

              {/* Ocurre Shipping Costs */}
              {formData.shipping_method === 'OCURRE' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Etapa 1 - Costo de Envío
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.shipping_stage1_cost || ''}
                      onChange={(e) => handleInputChange('shipping_stage1_cost', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="0.00"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Etapa 2 - Costo de Envío
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.shipping_stage2_cost || ''}
                      onChange={(e) => handleInputChange('shipping_stage2_cost', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="0.00"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Etapa 3 - Costo de Envío
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.shipping_stage3_cost || ''}
                      onChange={(e) => handleInputChange('shipping_stage3_cost', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="0.00"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Etapa 4 - Costo de Envío
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.shipping_stage4_cost || ''}
                      onChange={(e) => handleInputChange('shipping_stage4_cost', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="0.00"
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {/* Shipping Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas de Envío
                </label>
                <textarea
                  value={formData.shipping_notes}
                  onChange={(e) => handleInputChange('shipping_notes', e.target.value)}
                  placeholder="Notas sobre logística de envío..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-vertical"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => handleInputChange('is_active', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="text-sm font-medium text-gray-700">Relación activa</span>
              </label>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Notas adicionales sobre esta relación proveedor-producto..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-vertical"
              />
            </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/product-admin')}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving || formData.supplier_id === 0 || formData.product_id === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Guardando...
                  </>
                ) : (
                  isEditing ? 'Actualizar Relación' : 'Crear Relación'
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default SupplierProductFormPage;
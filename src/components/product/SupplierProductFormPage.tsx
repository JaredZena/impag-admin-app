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
  product_id: number;
  supplier_sku: string;
  cost: number | null;
  stock: number;
  lead_time_days: number | null;
  is_active: boolean;
  notes: string;
}

const SupplierProductFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [formData, setFormData] = useState<SupplierProductFormData>({
    supplier_id: 0,
    product_id: 0,
    supplier_sku: '',
    cost: null,
    stock: 0,
    lead_time_days: null,
    is_active: true,
    notes: ''
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
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
      // Fetch suppliers, products, and categories in parallel
      const [suppliersData, productsData, categoriesData] = await Promise.all([
        apiRequest('/suppliers'),
        apiRequest('/products'),
        apiRequest('/categories')
      ]);

      // Create category lookup
      const categoryMap = (categoriesData.data || []).reduce((acc: any, cat: any) => {
        acc[cat.id] = cat.name;
        return acc;
      }, {});

      setSuppliers(suppliersData.data || []);
      setProducts((productsData.data || []).map((p: any) => ({
        ...p,
        category_name: categoryMap[p.category_id] || 'Sin categoría'
      })));

      // If editing, fetch the existing relationship
      if (isEditing) {
        const relationshipData = await apiRequest(`/products/supplier-product/${id}`);
        if (relationshipData) {
          setFormData({
            supplier_id: relationshipData.supplier_id,
            product_id: relationshipData.product_id,
            supplier_sku: relationshipData.supplier_sku || '',
            cost: relationshipData.cost,
            stock: relationshipData.stock || 0,
            lead_time_days: relationshipData.lead_time_days,
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
        lead_time_days: formData.lead_time_days === null || formData.lead_time_days === 0 ? null : formData.lead_time_days
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

      navigate('/product-admin', {
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
            {/* Supplier and Product Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proveedor *
                </label>
                <select
                  value={formData.supplier_id}
                  onChange={(e) => handleInputChange('supplier_id', parseInt(e.target.value))}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Producto *
                </label>
                <select
                  value={formData.product_id}
                  onChange={(e) => handleInputChange('product_id', parseInt(e.target.value))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value={0}>Seleccionar producto...</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku}) - {product.category_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* SKU and Cost */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
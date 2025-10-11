import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/utils/api';

interface AddProductFormProps {
  supplierId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface ProductOption {
  id: number;
  name: string;
  base_sku: string;
  category_name?: string;
}

const AddProductForm: React.FC<AddProductFormProps> = ({
  supplierId,
  onSuccess,
  onCancel
}) => {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    cost: '',
    lead_time_days: '',
    shipping_cost: '',
    is_active: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productsLoading, setProductsLoading] = useState(false);

  // Search products on-demand instead of loading all upfront
  const searchProducts = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setProducts([]);
      return;
    }

    setProductsLoading(true);
    try {
      const response = await apiRequest(`/products?name=${encodeURIComponent(searchTerm)}&limit=50`);
      setProducts(response.data || []);
    } catch (err: any) {
      console.error('Error searching products:', err);
      setError('Error al buscar productos');
    } finally {
      setProductsLoading(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timeout = setTimeout(() => {
      searchProducts(searchTerm);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeout);
  }, [searchTerm]);

  // Products are already filtered by API search
  const filteredProducts = products;

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProductId) {
      setError('Por favor selecciona un producto');
      return;
    }

    if (!formData.cost) {
      setError('Por favor ingresa el precio');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const submitData = {
        product_id: selectedProductId,
        supplier_id: parseInt(supplierId),
        cost: parseFloat(formData.cost),
        lead_time_days: formData.lead_time_days ? parseInt(formData.lead_time_days) : null,
        shipping_cost: formData.shipping_cost ? parseFloat(formData.shipping_cost) : null,
        is_active: formData.is_active
      };

      await apiRequest('/products/supplier-products', {
        method: 'POST',
        body: JSON.stringify(submitData)
      });

      onSuccess();
    } catch (err: any) {
      console.error('Error creating supplier-product relationship:', err);
      setError(err.message || 'Error al agregar producto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 mb-6 border-2 border-dashed border-green-200 bg-green-50/30">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Agregar Producto a este Proveedor
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seleccionar Producto *
          </label>
          
          {/* Search Input */}
          <div className="relative mb-3">
            <Input
              type="text"
              placeholder="Buscar producto por nombre o SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
              disabled={productsLoading}
            />
            <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Product List */}
          <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto bg-white">
            {productsLoading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Buscando productos...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {searchTerm ? 'No se encontraron productos' : 'Escribe para buscar productos'}
              </div>
            ) : (
              filteredProducts.slice(0, 10).map((product) => (
                <div
                  key={product.id}
                  className={`p-3 border-b border-gray-100 cursor-pointer transition-colors ${
                    selectedProductId === product.id
                      ? 'bg-green-50 border-green-200'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedProductId(product.id)}
                >
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                      selectedProductId === product.id
                        ? 'bg-green-600 border-green-600'
                        : 'border-gray-300'
                    }`}>
                      {selectedProductId === product.id && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{product.name || 'Sin nombre'}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>SKU: {product.base_sku || 'N/A'}</span>
                        {product.category_name && (
                          <span>• {product.category_name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {filteredProducts.length > 10 && (
            <p className="text-xs text-gray-500 mt-2">
              Mostrando primeros 10 resultados. Usa la búsqueda para filtrar.
            </p>
          )}
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Precio *
            </label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.cost}
              onChange={(e) => handleInputChange('cost', e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tiempo de Entrega (días)
            </label>
            <Input
              type="number"
              placeholder="7"
              value={formData.lead_time_days}
              onChange={(e) => handleInputChange('lead_time_days', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Costo de Envío
            </label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.shipping_cost}
              onChange={(e) => handleInputChange('shipping_cost', e.target.value)}
            />
          </div>

          <div className="flex items-end pb-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active_inline"
                checked={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked)}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <label htmlFor="is_active_inline" className="text-sm font-medium text-gray-700">
                Activo
              </label>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading || !selectedProductId}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? 'Agregando...' : 'Agregar Producto'}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default AddProductForm;

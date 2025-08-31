import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import LoadingSpinner from '../ui/LoadingSpinner';
import { apiRequest } from '../../utils/api';

interface Product {
  id: number;
  name: string;
  sku: string;
  unit: string;
  price: number | null;
  stock: number;
  category_name?: string;
}

interface KitProduct {
  product_id: number;
  quantity: number;
  product?: Product;
}

interface Kit {
  id?: number;
  name: string;
  description?: string;
  sku: string;
  price?: number;
  is_active: boolean;
  products: KitProduct[];
  created_at?: string;
  last_updated?: string;
}

const KitManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [kits, setKits] = useState<Kit[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKit, setNewKit] = useState<Kit>({
    name: '',
    description: '',
    sku: '',
    price: undefined,
    is_active: true,
    products: []
  });
  const [selectedProducts, setSelectedProducts] = useState<KitProduct[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [kitsResponse, productsResponse] = await Promise.all([
        apiRequest('/kits'),
        apiRequest('/products?limit=1000')
      ]);
      
      if (kitsResponse.success) {
        setKits(kitsResponse.data || []);
      }
      
      if (productsResponse.success) {
        setProducts(productsResponse.data.products || []);
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const filteredKits = kits.filter(kit =>
    kit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    kit.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  const addProductToKit = (product: Product) => {
    const existingProduct = selectedProducts.find(p => p.product_id === product.id);
    if (existingProduct) {
      setSelectedProducts(selectedProducts.map(p =>
        p.product_id === product.id
          ? { ...p, quantity: p.quantity + 1 }
          : p
      ));
    } else {
      setSelectedProducts([...selectedProducts, {
        product_id: product.id,
        quantity: 1,
        product: product
      }]);
    }
  };

  const removeProductFromKit = (productId: number) => {
    setSelectedProducts(selectedProducts.filter(p => p.product_id !== productId));
  };

  const updateProductQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeProductFromKit(productId);
    } else {
      setSelectedProducts(selectedProducts.map(p =>
        p.product_id === productId
          ? { ...p, quantity }
          : p
      ));
    }
  };

  const calculateKitPrice = () => {
    return selectedProducts.reduce((total, kitProduct) => {
      return total + (kitProduct.product?.price || 0) * kitProduct.quantity;
    }, 0);
  };

  const handleSaveKit = async () => {
    if (!newKit.name.trim() || !newKit.sku.trim() || selectedProducts.length === 0) {
      setError('Por favor completa el nombre, SKU y selecciona al menos un producto');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const kitData = {
        ...newKit,
        price: newKit.price || calculateKitPrice(),
        products: selectedProducts.map(p => ({
          product_id: p.product_id,
          quantity: p.quantity
        }))
      };

      const response = await apiRequest('/kits', {
        method: 'POST',
        body: JSON.stringify(kitData),
      });

      if (response.success) {
        setKits([...kits, response.data]);
        setShowCreateForm(false);
        setNewKit({
          name: '',
          description: '',
          sku: '',
          price: undefined,
          is_active: true,
          products: []
        });
        setSelectedProducts([]);
        setProductSearchTerm('');
      } else {
        setError(response.error || 'Error creating kit');
      }
    } catch (err: any) {
      console.error('Error saving kit:', err);
      setError(err.message || 'Error saving kit');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-MX');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 px-4">
        <div className="max-w-7xl mx-auto">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestión de Kits</h1>
              <p className="text-gray-600 mt-1">
                Crea y administra kits de productos
              </p>
            </div>
            <div className="flex space-x-3">
              <Button 
                onClick={fetchData}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Actualizar
              </Button>
              <Button 
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Crear Kit
              </Button>
            </div>
          </div>
        </div>

        {/* Search */}
        {!showCreateForm && (
          <Card className="p-6">
            <Input
              placeholder="Buscar kits por nombre o SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </Card>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Create Kit Form */}
        {showCreateForm && (
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Crear Nuevo Kit</h2>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreateForm(false);
                  setSelectedProducts([]);
                  setNewKit({
                    name: '',
                    description: '',
                    sku: '',
                    price: undefined,
                    is_active: true,
                    products: []
                  });
                  setError(null);
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Kit Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Información del Kit</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Kit *
                  </label>
                  <Input
                    type="text"
                    value={newKit.name}
                    onChange={(e) => setNewKit({ ...newKit, name: e.target.value })}
                    placeholder="ej. Kit de Bombeo Solar"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SKU *
                  </label>
                  <Input
                    type="text"
                    value={newKit.sku}
                    onChange={(e) => setNewKit({ ...newKit, sku: e.target.value })}
                    placeholder="ej. KIT-BOMBEO-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    value={newKit.description}
                    onChange={(e) => setNewKit({ ...newKit, description: e.target.value })}
                    placeholder="Descripción del kit..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Precio (opcional)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newKit.price || ''}
                    onChange={(e) => setNewKit({ ...newKit, price: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder={`Automático: ${formatCurrency(calculateKitPrice())}`}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Si no se especifica, se calculará automáticamente sumando los precios de los productos
                  </p>
                </div>

                {/* Selected Products */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Productos Seleccionados</h4>
                  {selectedProducts.length === 0 ? (
                    <p className="text-gray-500 text-sm">No hay productos seleccionados</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedProducts.map(kitProduct => (
                        <div key={kitProduct.product_id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{kitProduct.product?.name}</p>
                            <p className="text-xs text-gray-500">{kitProduct.product?.sku}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              min="1"
                              value={kitProduct.quantity}
                              onChange={(e) => updateProductQuantity(kitProduct.product_id, parseInt(e.target.value) || 0)}
                              className="w-16 text-center"
                            />
                            <span className="text-sm text-gray-600">
                              {formatCurrency((kitProduct.product?.price || 0) * kitProduct.quantity)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeProductFromKit(kitProduct.product_id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </Button>
                          </div>
                        </div>
                      ))}
                      <div className="border-t pt-2">
                        <p className="font-bold text-right">
                          Total: {formatCurrency(calculateKitPrice())}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Product Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Seleccionar Productos</h3>
                
                <Input
                  placeholder="Buscar productos..."
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                />

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {filteredProducts.map(product => (
                    <div key={product.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.sku} • {product.category_name}</p>
                          <p className="text-sm text-green-600">{formatCurrency(product.price)}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addProductToKit(product)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  setSelectedProducts([]);
                  setNewKit({
                    name: '',
                    description: '',
                    sku: '',
                    price: undefined,
                    is_active: true,
                    products: []
                  });
                  setError(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveKit}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {saving ? (
                  <>
                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Guardando...
                  </>
                ) : (
                  'Guardar Kit'
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* Kits Table */}
        {!showCreateForm && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kit
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precio
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Productos
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Última Actualización
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredKits.map((kit) => (
                    <tr key={kit.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{kit.name}</div>
                          <div className="text-sm text-gray-500">{kit.sku}</div>
                          {kit.description && (
                            <div className="text-xs text-gray-400 mt-1">{kit.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {formatCurrency(kit.price)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {kit.products.length} producto{kit.products.length !== 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          kit.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {kit.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {formatDate(kit.last_updated)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-600 hover:text-green-800"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredKits.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-500">
                  {searchTerm ? 'No se encontraron kits que coincidan con la búsqueda' : 'No hay kits creados'}
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default KitManagementPage;

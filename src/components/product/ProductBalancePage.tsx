import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import LoadingSpinner from '../ui/LoadingSpinner';
import { apiRequest } from '../../utils/api';
import dayjs from 'dayjs';

interface Product {
  id: number;
  name: string;
  sku: string;
  unit: string;
  price: number | null;
  stock: number;
  category_name?: string;
}

interface Supplier {
  id: number;
  name: string;
  shipping_cost_per_unit?: number;
  shipping_cost_flat?: number;
}

interface SupplierOption {
  supplier_id: number;
  supplier_name: string;
  unit_cost: number;
  shipping_cost: number;
  total_unit_cost: number;
  shipping_method: string;
  stock: number;
  lead_time_days?: number;
  supplier_sku: string;
}

interface ProductComparison {
  product_id: number;
  product_name: string;
  product_sku: string;
  suppliers: SupplierOption[];
}

interface BalanceItem {
  id?: number;
  product_id: number;
  supplier_id: number;
  quantity: number;
  unit_price: number;
  shipping_cost: number;
  total_cost: number;
  notes?: string;
}

interface Balance {
  id?: number;
  name: string;
  description?: string;
  balance_type: string;
  total_amount?: number;
  currency: string;
  is_active: boolean;
  created_at?: string;
  last_updated?: string;
  items: BalanceItem[];
}

const ProductBalancePage: React.FC = () => {
  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [currentBalance, setCurrentBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateBalance, setShowCreateBalance] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productComparison, setProductComparison] = useState<ProductComparison | null>(null);
  const [loadingComparison, setLoadingComparison] = useState(false);
  
  // Form states
  const [balanceName, setBalanceName] = useState('');
  const [balanceDescription, setBalanceDescription] = useState('');
  const [balanceType, setBalanceType] = useState('QUOTATION');
  const [quantity, setQuantity] = useState(1);
  const [defaultMargin, setDefaultMargin] = useState(32);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [productsResponse, balancesResponse] = await Promise.all([
        apiRequest('/products?limit=1000'),
        apiRequest('/balance')
      ]);

      if (productsResponse.success) {
        setProducts(productsResponse.data || []);
      } else {
        throw new Error('Failed to load products');
      }

      if (Array.isArray(balancesResponse)) {
        setBalances(balancesResponse);
      } else {
        setBalances([]);
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const createNewBalance = async () => {
    if (!balanceName.trim()) {
      setError('Please enter a balance name');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const balanceData = {
        name: balanceName.trim(),
        description: balanceDescription.trim() || undefined,
        balance_type: balanceType,
        currency: 'MXN',
        items: []
      };

      const response = await apiRequest('/balance', {
        method: 'POST',
        body: JSON.stringify(balanceData)
      });

      setCurrentBalance(response);
      setBalances(prev => [response, ...prev]);
      setShowCreateBalance(false);
      setBalanceName('');
      setBalanceDescription('');
    } catch (err: any) {
      console.error('Error creating balance:', err);
      setError(err.message || 'Error creating balance');
    } finally {
      setSaving(false);
    }
  };

  const loadBalance = async (balanceId: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiRequest(`/balance/${balanceId}`);
      setCurrentBalance(response);
    } catch (err: any) {
      console.error('Error loading balance:', err);
      setError(err.message || 'Error loading balance');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductComparison = async (productId: number) => {
    try {
      setLoadingComparison(true);
      setError(null);
      
      const response = await apiRequest(`/balance/compare/${productId}`);
      setProductComparison(response);
    } catch (err: any) {
      console.error('Error fetching comparison:', err);
      setError(err.message || 'Error loading supplier comparison');
      setProductComparison(null);
    } finally {
      setLoadingComparison(false);
    }
  };

  const addProductToBalance = async (supplierId: number, unitPrice: number, shippingCost: number) => {
    if (!currentBalance || !selectedProduct) return;

    try {
      setSaving(true);
      setError(null);

      const newItem: BalanceItem = {
        product_id: selectedProduct.id,
        supplier_id: supplierId,
        quantity: quantity,
        unit_price: unitPrice,
        shipping_cost: shippingCost,
        total_cost: (unitPrice + shippingCost) * quantity
      };

      const updatedItems = [...(currentBalance.items || []), newItem];

      const updateData = {
        items: updatedItems
      };

      const response = await apiRequest(`/balance/${currentBalance.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      setCurrentBalance(response);
      setShowAddProduct(false);
      setSelectedProduct(null);
      setProductComparison(null);
      setQuantity(1);
      
      // Update the balance in the list
      setBalances(prev => 
        prev.map(b => b.id === currentBalance.id ? response : b)
      );
    } catch (err: any) {
      console.error('Error adding product:', err);
      setError(err.message || 'Error adding product to balance');
    } finally {
      setSaving(false);
    }
  };

  const removeBalanceItem = async (itemIndex: number) => {
    if (!currentBalance) return;

    try {
      setSaving(true);
      setError(null);

      const updatedItems = currentBalance.items.filter((_, index) => index !== itemIndex);

      const updateData = {
        items: updatedItems
      };

      const response = await apiRequest(`/balance/${currentBalance.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      setCurrentBalance(response);
      
      // Update the balance in the list
      setBalances(prev => 
        prev.map(b => b.id === currentBalance.id ? response : b)
      );
    } catch (err: any) {
      console.error('Error removing item:', err);
      setError(err.message || 'Error removing item');
    } finally {
      setSaving(false);
    }
  };

  const updateBalanceItem = async (itemIndex: number, updates: Partial<BalanceItem>) => {
    if (!currentBalance) return;

    try {
      setSaving(true);
      setError(null);

      const updatedItems = currentBalance.items.map((item, index) => {
        if (index === itemIndex) {
          const updatedItem = { ...item, ...updates };
          // Recalculate total cost
          updatedItem.total_cost = (updatedItem.unit_price + updatedItem.shipping_cost) * updatedItem.quantity;
          return updatedItem;
        }
        return item;
      });

      const updateData = {
        items: updatedItems
      };

      const response = await apiRequest(`/balance/${currentBalance.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      setCurrentBalance(response);
      
      // Update the balance in the list
      setBalances(prev => 
        prev.map(b => b.id === currentBalance.id ? response : b)
      );
    } catch (err: any) {
      console.error('Error updating item:', err);
      setError(err.message || 'Error updating item');
    } finally {
      setSaving(false);
    }
  };

  const exportToCSV = () => {
    if (!currentBalance || !currentBalance.items.length) return;

    const headers = [
      'Producto ID',
      'Proveedor ID', 
      'Cantidad',
      'Precio Unitario',
      'Costo Envío',
      'Costo Total',
      'Notas'
    ];

    const rows = currentBalance.items.map(item => [
      item.product_id,
      item.supplier_id,
      item.quantity,
      formatCurrency(item.unit_price),
      formatCurrency(item.shipping_cost),
      formatCurrency(item.total_cost),
      item.notes || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${currentBalance.name.replace(/[^a-z0-9]/gi, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateSuggestedPrice = (unitCost: number, shippingCost: number) => {
    const totalCost = unitCost + shippingCost;
    return totalCost * (1 + defaultMargin / 100);
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
              <h1 className="text-2xl font-bold text-gray-900">Balance de Productos</h1>
              <p className="text-gray-600 mt-1">
                Gestiona y compara cotizaciones de productos
              </p>
            </div>
            <div className="flex space-x-3">
              <Button 
                onClick={() => setShowCreateBalance(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nuevo Balance
              </Button>
            </div>
          </div>
        </div>

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

        {/* Create Balance Modal */}
        {showCreateBalance && (
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Crear Nuevo Balance</h2>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreateBalance(false);
                  setBalanceName('');
                  setBalanceDescription('');
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Balance *
                </label>
                <Input
                  type="text"
                  value={balanceName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBalanceName(e.target.value)}
                  placeholder="ej. Cotización Cliente ABC"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Balance
                </label>
                <select
                  value={balanceType}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBalanceType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="QUOTATION">Cotización</option>
                  <option value="COMPARISON">Comparación</option>
                  <option value="ANALYSIS">Análisis</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={balanceDescription}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBalanceDescription(e.target.value)}
                  placeholder="Descripción opcional del balance"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowCreateBalance(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={createNewBalance}
                disabled={saving || !balanceName.trim()}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {saving ? 'Creando...' : 'Crear Balance'}
              </Button>
            </div>
          </Card>
        )}

        {/* Balance List */}
        {!currentBalance && (
          <Card className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Balances Existentes</h2>
            
            {balances.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay balances</h3>
                <p className="text-gray-600 mb-4">Crea tu primer balance para comenzar</p>
                <Button
                  onClick={() => setShowCreateBalance(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Crear Primer Balance
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {balances.map((balance) => (
                  <div
                    key={balance.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => loadBalance(balance.id!)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{balance.name}</h3>
                        {balance.description && (
                          <p className="text-sm text-gray-600 mt-1">{balance.description}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                            {balance.balance_type}
                          </span>
                          <span>{balance.items?.length || 0} productos</span>
                          {balance.created_at && (
                            <span>Creado {dayjs(balance.created_at).format('DD/MM/YYYY')}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          {formatCurrency(balance.total_amount)}
                        </p>
                        <p className="text-sm text-gray-500">{balance.currency}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Current Balance Details */}
        {currentBalance && (
          <>
            {/* Balance Header */}
            <Card className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="ghost"
                      onClick={() => setCurrentBalance(null)}
                      className="p-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                    </Button>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{currentBalance.name}</h2>
                      {currentBalance.description && (
                        <p className="text-gray-600 mt-1">{currentBalance.description}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <Button 
                    onClick={() => setShowAddProduct(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar Producto
                  </Button>
                  {currentBalance.items?.length > 0 && (
                    <Button 
                      onClick={exportToCSV}
                      variant="outline"
                      className="border-green-300 text-green-700 hover:bg-green-50"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Exportar CSV
                    </Button>
                  )}
                </div>
              </div>

              {/* Balance Summary */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600">Total de Productos</p>
                  <p className="text-2xl font-bold text-blue-700">{currentBalance.items?.length || 0}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600">Monto Total</p>
                  <p className="text-2xl font-bold text-green-700">{formatCurrency(currentBalance.total_amount)}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-600">Tipo</p>
                  <p className="text-lg font-bold text-purple-700">{currentBalance.balance_type}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Margen por Defecto</p>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      value={defaultMargin}
                      onChange={(e) => setDefaultMargin(parseFloat(e.target.value) || 0)}
                      className="w-20 text-lg font-bold"
                      min="0"
                      step="1"
                    />
                    <span className="text-lg font-bold text-gray-700">%</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Add Product Modal */}
            {showAddProduct && (
              <Card className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Agregar Producto al Balance</h2>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowAddProduct(false);
                      setSelectedProduct(null);
                      setProductComparison(null);
                      setQuantity(1);
                    }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Product Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Buscar Producto
                    </label>
                    <Input
                      placeholder="Buscar productos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="mt-4 max-h-64 overflow-y-auto space-y-2">
                      {filteredProducts.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                          {searchTerm 
                            ? `No se encontraron productos que coincidan con "${searchTerm}"`
                            : 'Empieza escribiendo para buscar productos'
                          }
                        </div>
                      ) : (
                        filteredProducts.map(product => (
                          <div
                            key={product.id}
                            className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                              selectedProduct?.id === product.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:bg-gray-50'
                            }`}
                            onClick={() => {
                              setSelectedProduct(product);
                              fetchProductComparison(product.id);
                            }}
                          >
                            <p className="font-medium text-sm">{product.name}</p>
                            <p className="text-xs text-gray-500">{product.sku} • {product.category_name}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Supplier Comparison */}
                  {selectedProduct && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Comparación de Proveedores - {selectedProduct.name}
                      </h3>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cantidad
                        </label>
                        <Input
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        />
                      </div>

                      {loadingComparison ? (
                        <div className="flex justify-center py-4">
                          <LoadingSpinner />
                        </div>
                      ) : productComparison && productComparison.suppliers.length > 0 ? (
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {productComparison.suppliers.map((supplier) => {
                            const suggestedPrice = calculateSuggestedPrice(supplier.unit_cost, supplier.shipping_cost);
                            const totalCost = (supplier.unit_cost + supplier.shipping_cost) * quantity;
                            const totalSelling = suggestedPrice * quantity;
                            const profit = totalSelling - totalCost;

                            return (
                              <div
                                key={supplier.supplier_id}
                                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <p className="font-medium text-gray-900">{supplier.supplier_name}</p>
                                    <p className="text-xs text-gray-500">SKU: {supplier.supplier_sku}</p>
                                  </div>
                                  <Button
                                    onClick={() => addProductToBalance(
                                      supplier.supplier_id,
                                      supplier.unit_cost,
                                      supplier.shipping_cost
                                    )}
                                    disabled={saving}
                                    className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1"
                                  >
                                    {saving ? 'Agregando...' : 'Agregar'}
                                  </Button>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="text-gray-500">Costo unitario:</span>
                                    <span className="ml-1 font-medium">{formatCurrency(supplier.unit_cost)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Envío:</span>
                                    <span className="ml-1 font-medium">{formatCurrency(supplier.shipping_cost)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Total costo:</span>
                                    <span className="ml-1 font-medium">{formatCurrency(totalCost)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">P. sugerido:</span>
                                    <span className="ml-1 font-medium text-blue-600">{formatCurrency(totalSelling)}</span>
                                  </div>
                                  <div className="col-span-2">
                                    <span className="text-gray-500">Ganancia estimada:</span>
                                    <span className="ml-1 font-medium text-green-600">{formatCurrency(profit)}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : productComparison ? (
                        <div className="text-center py-4 text-gray-500">
                          No hay proveedores disponibles para este producto
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Balance Items */}
            {currentBalance.items && currentBalance.items.length > 0 ? (
              <Card className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Productos en el Balance</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left">Producto ID</th>
                        <th className="px-4 py-3 text-left">Proveedor ID</th>
                        <th className="px-4 py-3 text-right">Cantidad</th>
                        <th className="px-4 py-3 text-right">Precio Unitario</th>
                        <th className="px-4 py-3 text-right">Costo Envío</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentBalance.items.map((item, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">{item.product_id}</td>
                          <td className="px-4 py-3">{item.supplier_id}</td>
                          <td className="px-4 py-3 text-right">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateBalanceItem(index, { quantity: parseInt(e.target.value) || 1 })}
                              className="w-20 text-right"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">{formatCurrency(item.unit_price)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(item.shipping_cost)}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.total_cost)}</td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              variant="ghost"
                              onClick={() => removeBalanceItem(index)}
                              disabled={saving}
                              className="text-red-600 hover:text-red-800 p-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : (
              <Card className="p-12 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay productos en este balance</h3>
                <p className="text-gray-600 mb-4">
                  Agrega productos para comenzar a construir tu balance
                </p>
                <Button 
                  onClick={() => setShowAddProduct(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Agregar Primer Producto
                </Button>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProductBalancePage;
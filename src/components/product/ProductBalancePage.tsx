import React, { useState, useEffect } from 'react';
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

interface Supplier {
  id: number;
  name: string;
  shipping_cost_per_unit?: number;
  shipping_cost_flat?: number;
}

interface SupplierProduct {
  id: number;
  supplier_id: number;
  product_id: number;
  supplier_sku: string;
  supplier_price: number;
  shipping_cost_per_unit?: number;
  shipping_cost_flat?: number;
  supplier?: Supplier;
  product?: Product;
}

interface BalanceItem {
  id: string;
  product_id: number;
  product_name: string;
  quantity: number;
  unit: string;
  supplier_comparisons: SupplierComparison[];
  selected_supplier_id?: number;
}

interface SupplierComparison {
  supplier_id: number;
  supplier_name: string;
  supplier_sku: string;
  unit_price: number;
  total_price: number;
  shipping_per_unit: number;
  shipping_total: number;
  real_cost_per_unit: number;
  real_total_cost: number;
  margin_percentage: number;
  selling_price_per_unit: number;
  selling_total_price: number;
  profit_per_unit: number;
  profit_total: number;
}

const ProductBalancePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([]);
  const [balanceItems, setBalanceItems] = useState<BalanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [defaultMargin, setDefaultMargin] = useState(32); // Default 32% margin
  const [quoteName, setQuoteName] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsResponse, suppliersResponse, supplierProductsResponse] = await Promise.all([
        apiRequest('/products?limit=1000'),
        apiRequest('/suppliers'),
        apiRequest('/supplier-products?limit=1000')
      ]);
      
      if (productsResponse.success) {
        setProducts(productsResponse.data.products || []);
      }
      
      if (suppliersResponse.success) {
        setSuppliers(suppliersResponse.data || []);
      }

      if (supplierProductsResponse.success) {
        setSupplierProducts(supplierProductsResponse.data.supplier_products || []);
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addProductToBalance = () => {
    if (!selectedProduct) return;

    // Find all supplier products for this product
    const productSuppliers = supplierProducts.filter(sp => sp.product_id === selectedProduct.id);
    
    // Create supplier comparisons
    const supplierComparisons: SupplierComparison[] = productSuppliers.map(sp => {
      const unitPrice = sp.supplier_price;
      const totalPrice = unitPrice * quantity;
      const shippingPerUnit = sp.shipping_cost_per_unit || sp.supplier?.shipping_cost_per_unit || 0;
      const shippingTotal = sp.shipping_cost_flat 
        ? sp.shipping_cost_flat 
        : shippingPerUnit * quantity;
      const realCostPerUnit = unitPrice + (shippingTotal / quantity);
      const realTotalCost = realCostPerUnit * quantity;
      const sellingPricePerUnit = realCostPerUnit * (1 + defaultMargin / 100);
      const sellingTotalPrice = sellingPricePerUnit * quantity;
      const profitPerUnit = sellingPricePerUnit - realCostPerUnit;
      const profitTotal = profitPerUnit * quantity;

      return {
        supplier_id: sp.supplier_id,
        supplier_name: sp.supplier?.name || 'N/A',
        supplier_sku: sp.supplier_sku,
        unit_price: unitPrice,
        total_price: totalPrice,
        shipping_per_unit: shippingPerUnit,
        shipping_total: shippingTotal,
        real_cost_per_unit: realCostPerUnit,
        real_total_cost: realTotalCost,
        margin_percentage: defaultMargin,
        selling_price_per_unit: sellingPricePerUnit,
        selling_total_price: sellingTotalPrice,
        profit_per_unit: profitPerUnit,
        profit_total: profitTotal,
      };
    });

    const newBalanceItem: BalanceItem = {
      id: `${selectedProduct.id}-${Date.now()}`,
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      quantity: quantity,
      unit: selectedProduct.unit,
      supplier_comparisons: supplierComparisons,
    };

    setBalanceItems([...balanceItems, newBalanceItem]);
    setShowAddProduct(false);
    setSelectedProduct(null);
    setQuantity(1);
    setSearchTerm('');
  };

  const removeBalanceItem = (id: string) => {
    setBalanceItems(balanceItems.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    setBalanceItems(balanceItems.map(item => {
      if (item.id === id) {
        // Recalculate supplier comparisons with new quantity
        const updatedComparisons = item.supplier_comparisons.map(comp => {
          const totalPrice = comp.unit_price * newQuantity;
          const shippingTotal = comp.shipping_per_unit > 0 
            ? comp.shipping_per_unit * newQuantity 
            : comp.shipping_total; // Keep flat shipping cost
          const realCostPerUnit = comp.unit_price + (shippingTotal / newQuantity);
          const realTotalCost = realCostPerUnit * newQuantity;
          const sellingPricePerUnit = realCostPerUnit * (1 + comp.margin_percentage / 100);
          const sellingTotalPrice = sellingPricePerUnit * newQuantity;
          const profitPerUnit = sellingPricePerUnit - realCostPerUnit;
          const profitTotal = profitPerUnit * newQuantity;

          return {
            ...comp,
            total_price: totalPrice,
            shipping_total: shippingTotal,
            real_cost_per_unit: realCostPerUnit,
            real_total_cost: realTotalCost,
            selling_price_per_unit: sellingPricePerUnit,
            selling_total_price: sellingTotalPrice,
            profit_per_unit: profitPerUnit,
            profit_total: profitTotal,
          };
        });

        return {
          ...item,
          quantity: newQuantity,
          supplier_comparisons: updatedComparisons,
        };
      }
      return item;
    }));
  };

  const selectSupplierForItem = (itemId: string, supplierId: number) => {
    setBalanceItems(balanceItems.map(item =>
      item.id === itemId
        ? { ...item, selected_supplier_id: supplierId }
        : item
    ));
  };

  const exportToCSV = () => {
    if (balanceItems.length === 0) return;

    const headers = [
      'Producto',
      'Cantidad',
      'Unidad',
      'Proveedor',
      'SKU Proveedor',
      'Precio Unitario',
      'Importe Total',
      'Envío Por Unidad',
      'Envío Total',
      'Costo Real Unitario',
      'Costo Total',
      'Margen %',
      'Precio Venta Unitario',
      'Precio Venta Total',
      'Ganancia Unitaria',
      'Ganancia Total'
    ];

    const rows = balanceItems.flatMap(item =>
      item.supplier_comparisons.map(comp => [
        item.product_name,
        item.quantity,
        item.unit,
        comp.supplier_name,
        comp.supplier_sku,
        formatCurrency(comp.unit_price),
        formatCurrency(comp.total_price),
        formatCurrency(comp.shipping_per_unit),
        formatCurrency(comp.shipping_total),
        formatCurrency(comp.real_cost_per_unit),
        formatCurrency(comp.real_total_cost),
        `${comp.margin_percentage}%`,
        formatCurrency(comp.selling_price_per_unit),
        formatCurrency(comp.selling_total_price),
        formatCurrency(comp.profit_per_unit),
        formatCurrency(comp.profit_total)
      ])
    );

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${quoteName || 'balance_productos'}.csv`);
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

  const getSelectedTotals = () => {
    const selectedItems = balanceItems.filter(item => item.selected_supplier_id);
    const totalCost = selectedItems.reduce((sum, item) => {
      const selectedSupplier = item.supplier_comparisons.find(s => s.supplier_id === item.selected_supplier_id);
      return sum + (selectedSupplier?.real_total_cost || 0);
    }, 0);
    const totalSellingPrice = selectedItems.reduce((sum, item) => {
      const selectedSupplier = item.supplier_comparisons.find(s => s.supplier_id === item.selected_supplier_id);
      return sum + (selectedSupplier?.selling_total_price || 0);
    }, 0);
    const totalProfit = totalSellingPrice - totalCost;

    return { totalCost, totalSellingPrice, totalProfit };
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
                Compara proveedores y analiza costos para cotizaciones
              </p>
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
              {balanceItems.length > 0 && (
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
        </div>

        {/* Configuration */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la Cotización
              </label>
              <Input
                type="text"
                value={quoteName}
                onChange={(e) => setQuoteName(e.target.value)}
                placeholder="ej. Cotización Cliente ABC"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Margen por Defecto (%)
              </label>
              <Input
                type="number"
                value={defaultMargin}
                onChange={(e) => setDefaultMargin(parseFloat(e.target.value) || 0)}
                min="0"
                step="1"
              />
            </div>
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                <p><strong>Productos:</strong> {balanceItems.length}</p>
                <p><strong>Seleccionados:</strong> {balanceItems.filter(i => i.selected_supplier_id).length}</p>
              </div>
            </div>
          </div>
        </Card>

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

        {/* Add Product Modal */}
        {showAddProduct && (
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Agregar Producto</h2>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowAddProduct(false);
                  setSelectedProduct(null);
                  setQuantity(1);
                  setSearchTerm('');
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  {filteredProducts.map(product => (
                    <div
                      key={product.id}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        selectedProduct?.id === product.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedProduct(product)}
                    >
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.sku} • {product.category_name}</p>
                    </div>
                  ))}
                </div>
              </div>

              {selectedProduct && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Producto Seleccionado</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="font-medium">{selectedProduct.name}</p>
                    <p className="text-sm text-gray-600">{selectedProduct.sku}</p>
                    <p className="text-sm text-gray-600">Unidad: {selectedProduct.unit}</p>
                  </div>

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

                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      Proveedores disponibles: {supplierProducts.filter(sp => sp.product_id === selectedProduct.id).length}
                    </p>
                  </div>

                  <Button
                    onClick={addProductToBalance}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    Agregar al Balance
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Selected Totals */}
        {balanceItems.some(item => item.selected_supplier_id) && (
          <Card className="p-6 bg-green-50 border-green-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Resumen de Selección</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Costo Total</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(getSelectedTotals().totalCost)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Precio de Venta Total</p>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(getSelectedTotals().totalSellingPrice)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Ganancia Total</p>
                <p className="text-2xl font-bold text-purple-700">{formatCurrency(getSelectedTotals().totalProfit)}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Balance Items */}
        {balanceItems.map((item) => (
          <Card key={item.id} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{item.product_name}</h3>
                <div className="flex items-center space-x-4 mt-2">
                  <div>
                    <label className="block text-xs text-gray-500">Cantidad</label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                      className="w-20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Unidad</label>
                    <p className="text-sm font-medium">{item.unit}</p>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={() => removeBalanceItem(item.id)}
                className="text-red-600 hover:text-red-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </Button>
            </div>

            {item.supplier_comparisons.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hay proveedores disponibles para este producto</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-2 py-2 text-left">Seleccionar</th>
                      <th className="px-2 py-2 text-left">Proveedor</th>
                      <th className="px-2 py-2 text-left">SKU</th>
                      <th className="px-2 py-2 text-right">Precio Unit.</th>
                      <th className="px-2 py-2 text-right">Importe Total</th>
                      <th className="px-2 py-2 text-right">Envío Unit.</th>
                      <th className="px-2 py-2 text-right">Envío Total</th>
                      <th className="px-2 py-2 text-right">Costo Real Unit.</th>
                      <th className="px-2 py-2 text-right">Costo Total</th>
                      <th className="px-2 py-2 text-right">%</th>
                      <th className="px-2 py-2 text-right">P. Venta Unit.</th>
                      <th className="px-2 py-2 text-right">P. Venta Total</th>
                      <th className="px-2 py-2 text-right">Ganancia Unit.</th>
                      <th className="px-2 py-2 text-right">Ganancia Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.supplier_comparisons.map((comp) => (
                      <tr
                        key={comp.supplier_id}
                        className={`border-b hover:bg-gray-50 ${
                          item.selected_supplier_id === comp.supplier_id ? 'bg-blue-50 border-blue-200' : ''
                        }`}
                      >
                        <td className="px-2 py-2">
                          <input
                            type="radio"
                            name={`supplier-${item.id}`}
                            checked={item.selected_supplier_id === comp.supplier_id}
                            onChange={() => selectSupplierForItem(item.id, comp.supplier_id)}
                            className="text-blue-600"
                          />
                        </td>
                        <td className="px-2 py-2 font-medium">{comp.supplier_name}</td>
                        <td className="px-2 py-2">{comp.supplier_sku}</td>
                        <td className="px-2 py-2 text-right">{formatCurrency(comp.unit_price)}</td>
                        <td className="px-2 py-2 text-right">{formatCurrency(comp.total_price)}</td>
                        <td className="px-2 py-2 text-right">{formatCurrency(comp.shipping_per_unit)}</td>
                        <td className="px-2 py-2 text-right">{formatCurrency(comp.shipping_total)}</td>
                        <td className="px-2 py-2 text-right font-medium">{formatCurrency(comp.real_cost_per_unit)}</td>
                        <td className="px-2 py-2 text-right font-medium">{formatCurrency(comp.real_total_cost)}</td>
                        <td className="px-2 py-2 text-right">{comp.margin_percentage}%</td>
                        <td className="px-2 py-2 text-right text-blue-600 font-medium">{formatCurrency(comp.selling_price_per_unit)}</td>
                        <td className="px-2 py-2 text-right text-blue-600 font-medium">{formatCurrency(comp.selling_total_price)}</td>
                        <td className="px-2 py-2 text-right text-green-600 font-medium">{formatCurrency(comp.profit_per_unit)}</td>
                        <td className="px-2 py-2 text-right text-green-600 font-medium">{formatCurrency(comp.profit_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        ))}

        {balanceItems.length === 0 && !showAddProduct && (
          <Card className="p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay productos en el balance</h3>
            <p className="text-gray-600 mb-4">
              Agrega productos para comenzar a comparar proveedores y crear tu cotización
            </p>
            <Button 
              onClick={() => setShowAddProduct(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Agregar Primer Producto
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProductBalancePage;

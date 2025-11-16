import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import LoadingSpinner from '../ui/LoadingSpinner';
import { apiRequest } from '../../utils/api';

interface StockProduct {
  id: number;
  name: string;
  sku: string;
  supplier_id: number;
  supplier_name: string;
  unit: string;
  stock: number;
  price: number | null;
  currency: string;
  total_value: number | null;
  last_updated: string | null;
}

interface StockUpdate {
  product_id: number;
  stock: number;
  price?: number;
}

const StockManagementPage: React.FC = () => {
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [includeZeroStock, setIncludeZeroStock] = useState(false);
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [tempValues, setTempValues] = useState<{[key: number]: {stock: string, price: string}}>({});
  const [saving, setSaving] = useState<{[key: number]: boolean}>({});
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchStockData();
  }, [includeZeroStock, sortBy, sortOrder]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      // If clicking the same column, toggle sort order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // If clicking a different column, set new column and default to asc
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <span className="text-gray-400">↕</span>;
    }
    return sortOrder === 'asc' ? <span className="text-blue-600">↑</span> : <span className="text-blue-600">↓</span>;
  };

  const SortableHeader = ({ column, children, className = "" }: { column: string; children: React.ReactNode; className?: string }) => (
    <th 
      className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none ${className}`}
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {getSortIcon(column)}
      </div>
    </th>
  );

  const fetchStockData = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(`/products/stock?include_zero_stock=${includeZeroStock}&limit=500&sort_by=${sortBy}&sort_order=${sortOrder}`);
      
      if (response.success) {
        setProducts(response.data.products);
      } else {
        setError(response.error || 'Error loading stock data');
      }
    } catch (err: any) {
      console.error('Error fetching stock data:', err);
      setError('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  const handleEditStart = (product: StockProduct) => {
    setEditingProduct(product.id);
    setTempValues({
      ...tempValues,
      [product.id]: {
        stock: product.stock.toString(),
        price: product.price?.toString() || ''
      }
    });
  };

  const handleEditCancel = (productId: number) => {
    setEditingProduct(null);
    const newTempValues = { ...tempValues };
    delete newTempValues[productId];
    setTempValues(newTempValues);
  };

  const handleEditSave = async (productId: number) => {
    const tempValue = tempValues[productId];
    if (!tempValue) return;

    try {
      setSaving({ ...saving, [productId]: true });
      
      const stock = parseInt(tempValue.stock) || 0;
      const price = tempValue.price ? parseFloat(tempValue.price) : undefined;
      
      const response = await apiRequest(`/products/${productId}/stock?stock=${stock}${price ? `&price=${price}` : ''}`, {
        method: 'PATCH'
      });
      
      if (response.success) {
        // Update the product in the local state
        setProducts(products.map(p => 
          p.id === productId 
            ? { 
                ...p, 
                stock: stock,
                price: price || p.price,
                total_value: price && stock ? stock * price : p.total_value,
                last_updated: response.data.last_updated
              }
            : p
        ));
        
        setEditingProduct(null);
        const newTempValues = { ...tempValues };
        delete newTempValues[productId];
        setTempValues(newTempValues);
      } else {
        setError(response.data.error || 'Error updating stock');
      }
    } catch (err: any) {
      console.error('Error updating stock:', err);
      setError('Error updating stock');
    } finally {
      setSaving({ ...saving, [productId]: false });
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number | null, currency: string | null | undefined = 'MXN') => {
    if (amount === null) return '-';
    const validCurrency = currency || 'MXN';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: validCurrency
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
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
              <h1 className="text-2xl font-bold text-gray-900">Gestión de Inventario</h1>
              <p className="text-gray-600 mt-1">
                Administra los niveles de stock y precios de tus productos
              </p>
            </div>
            <Button 
              onClick={fetchStockData}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </Button>
          </div>
        </div>

                {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-4V8a1 1 0 00-1-1H7a1 1 0 00-1 1v1m0 4h.01" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Productos</p>
                <p className="text-2xl font-bold text-gray-900">{products.length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Con Stock</p>
                <p className="text-2xl font-bold text-gray-900">
                  {products.filter(p => p.stock > 0).length}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Valor Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(products.reduce((sum, p) => sum + (p.total_value || 0), 0))}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nombre o SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includeZeroStock"
                checked={includeZeroStock}
                onChange={(e) => setIncludeZeroStock(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="includeZeroStock" className="text-sm text-gray-600">
                Incluir productos sin stock
              </label>
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

        {/* Stock Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <SortableHeader column="name">
                    Producto
                  </SortableHeader>
                  <SortableHeader column="supplier">
                    Proveedor
                  </SortableHeader>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unidad
                  </th>
                  <SortableHeader column="stock">
                    Stock
                  </SortableHeader>
                  <SortableHeader column="price">
                    Costo Unitario
                  </SortableHeader>
                  <SortableHeader column="total_value">
                    Valor Total
                  </SortableHeader>
                  <SortableHeader column="last_updated" className="hidden md:table-cell">
                    Última Actualización
                  </SortableHeader>
                  <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs md:max-w-sm">
                          {product.name}
                        </div>
                        <div className="text-sm text-gray-500">{product.sku}</div>
                        {/* Show last updated on mobile under product name */}
                        <div className="md:hidden text-xs text-gray-400 mt-1">
                          {formatDate(product.last_updated)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {product.supplier_name}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {product.unit}
                    </td>
                    <td className="px-4 py-4">
                      {editingProduct === product.id ? (
                        <Input
                          type="number"
                          value={tempValues[product.id]?.stock || ''}
                          onChange={(e) => setTempValues({
                            ...tempValues,
                            [product.id]: {
                              ...tempValues[product.id],
                              stock: e.target.value
                            }
                          })}
                          className="w-20"
                          min="0"
                        />
                      ) : (
                        <span className={`text-sm font-medium ${
                          product.stock > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {product.stock.toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {editingProduct === product.id ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={tempValues[product.id]?.price || ''}
                          onChange={(e) => setTempValues({
                            ...tempValues,
                            [product.id]: {
                              ...tempValues[product.id],
                              price: e.target.value
                            }
                          })}
                          className="w-28"
                          min="0"
                        />
                      ) : (
                        <span className="text-sm text-gray-900">
                          {formatCurrency(product.price, product.currency)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">
                      {formatCurrency(product.total_value, product.currency)}
                    </td>
                    <td className="hidden md:table-cell px-4 py-4 text-sm text-gray-500">
                      {formatDate(product.last_updated)}
                    </td>
                    <td className="hidden md:table-cell px-4 py-4">
                      {editingProduct === product.id ? (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleEditSave(product.id)}
                            disabled={saving[product.id]}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            {saving[product.id] ? (
                              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditCancel(product.id)}
                            disabled={saving[product.id]}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditStart(product)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredProducts.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-500">
                {searchTerm ? 'No se encontraron productos que coincidan con la búsqueda' : 'No hay productos en stock'}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default StockManagementPage;

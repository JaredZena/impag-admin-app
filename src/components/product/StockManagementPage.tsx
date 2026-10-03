import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import LoadingSpinner from '../ui/LoadingSpinner';
import { ApiError, apiRequest } from '../../utils/api';
import CSVExportModal from './CSVExportModal';
import { ColumnOption, convertToCSV, downloadCSV } from '../../utils/csvExport';

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

const LOAD_ERROR = 'No se pudo cargar el stock. Toca «Actualizar» para intentar de nuevo.';
const SAVE_ERROR = 'No se pudo guardar el stock. Intenta de nuevo.';
const EXPORT_ERROR = 'No se pudo exportar el archivo. Intenta de nuevo.';

// apiRequest already throws plain-Spanish ApiErrors; anything else gets the generic message
const errorMessage = (err: unknown, fallback: string) =>
  err instanceof ApiError ? err.message : fallback;

// Backend caps limit at 1000; with zero-stock items there are more rows than that
const STOCK_PAGE_SIZE = 1000;

const fetchAllStock = async (includeZeroStock: boolean, sortBy: string, sortOrder: string) => {
  const byId = new Map<number, StockProduct>();
  for (let offset = 0; ; offset += STOCK_PAGE_SIZE) {
    const response = await apiRequest(
      `/products/stock?include_zero_stock=${includeZeroStock}&limit=${STOCK_PAGE_SIZE}&offset=${offset}&sort_by=${sortBy}&sort_order=${sortOrder}`
    );
    if (!response.success || !response.data?.products) {
      throw new Error(response.error || 'Invalid stock response');
    }
    const page: StockProduct[] = response.data.products;
    page.forEach(p => byId.set(p.id, p));
    if (page.length < STOCK_PAGE_SIZE) return [...byId.values()];
  }
};

// Phones get cards instead of the table; render one or the other, not both
const WIDE_QUERY = '(min-width: 768px)';
const PHONE_BATCH = 50;

const StockManagementPage: React.FC = () => {
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [includeZeroStock, setIncludeZeroStock] = useState(true);
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [tempValues, setTempValues] = useState<{[key: number]: {stock: string, price: string}}>({});
  const [saving, setSaving] = useState<{[key: number]: boolean}>({});
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isWide, setIsWide] = useState(() => window.matchMedia(WIDE_QUERY).matches);
  const [phoneLimit, setPhoneLimit] = useState(PHONE_BATCH);

  useEffect(() => {
    const mq = window.matchMedia(WIDE_QUERY);
    const onChange = () => setIsWide(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

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

  const fetchStockData = useCallback(async () => {
    try {
      setLoading(true);
      setProducts(await fetchAllStock(includeZeroStock, sortBy, sortOrder));
      setError(null);
    } catch (err) {
      console.error('Error fetching stock data:', err);
      setError(errorMessage(err, LOAD_ERROR));
    } finally {
      setLoading(false);
    }
  }, [includeZeroStock, sortBy, sortOrder]);

  useEffect(() => {
    fetchStockData();
  }, [fetchStockData]);

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

    // The backend stores whole units only
    const stock = Number(tempValue.stock);
    if (tempValue.stock.trim() === '' || !Number.isInteger(stock) || stock < 0) {
      setError('Escribe el stock como número entero, 0 o más (sin decimales).');
      return;
    }
    const price = tempValue.price ? parseFloat(tempValue.price) : undefined;

    try {
      setSaving(prev => ({ ...prev, [productId]: true }));

      const response = await apiRequest(`/products/${productId}/stock?stock=${stock}${price ? `&price=${price}` : ''}`, {
        method: 'PATCH'
      });

      if (response.success) {
        const saved = response.data;
        setProducts(prev => prev.map(p =>
          p.id === productId
            ? {
                ...p,
                stock: saved.stock ?? stock,
                price: saved.price ?? price ?? p.price,
                total_value: saved.total_value ?? null,
                last_updated: saved.last_updated
              }
            : p
        ));

        setEditingProduct(null);
        setTempValues(prev => {
          const next = { ...prev };
          delete next[productId];
          return next;
        });
        setError(null);
      } else {
        console.error('Error updating stock:', response.error);
        setError(SAVE_ERROR);
      }
    } catch (err) {
      console.error('Error updating stock:', err);
      setError(errorMessage(err, SAVE_ERROR));
    } finally {
      setSaving(prev => ({ ...prev, [productId]: false }));
    }
  };

  const setTempStock = (productId: number, stock: string) =>
    setTempValues(prev => ({ ...prev, [productId]: { ...prev[productId], stock } }));

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.sku || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  const phoneProducts = filteredProducts.slice(0, phoneLimit);
  const emptyMessage = searchTerm
    ? `No se encontró «${searchTerm}».${includeZeroStock ? '' : ' Si está agotado, activa «Mostrar productos sin existencia».'}`
    : includeZeroStock
      ? 'No hay productos.'
      : 'No hay productos con existencia. Activa «Mostrar productos sin existencia» para ver todos.';

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

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  };

  // Most recent update across the whole inventory (ISO strings compare lexicographically)
  const lastInventoryUpdate = products.reduce<string | null>(
    (max, p) => (p.last_updated && (!max || p.last_updated > max) ? p.last_updated : max),
    null
  );

  // CSV Export functionality
  const supplierProductColumns: ColumnOption[] = [
    { key: 'id', label: 'ID', defaultSelected: true },
    { key: 'name', label: 'Nombre del Producto', defaultSelected: true },
    { key: 'sku', label: 'SKU', defaultSelected: true },
    { key: 'supplier_name', label: 'Proveedor', defaultSelected: true },
    { key: 'supplier_id', label: 'ID Proveedor', defaultSelected: false },
    { key: 'unit', label: 'Unidad', defaultSelected: true },
    { key: 'stock', label: 'Stock', defaultSelected: true },
    { key: 'price', label: 'Costo Unitario', defaultSelected: true },
    { key: 'currency', label: 'Moneda', defaultSelected: true },
    { key: 'total_value', label: 'Valor Total', defaultSelected: true },
    { key: 'last_updated', label: 'Última Actualización', defaultSelected: true },
  ];

  const handleExportCSV = async (selectedColumns: string[]) => {
    setIsExporting(true);
    try {
      const allStockProducts = await fetchAllStock(includeZeroStock, sortBy, sortOrder);

      // Transform data for CSV export
      const csvData = allStockProducts.map(product => ({
        id: product.id,
        name: product.name || '',
        sku: product.sku || '',
        supplier_name: product.supplier_name || '',
        supplier_id: product.supplier_id || '',
        unit: product.unit || '',
        stock: product.stock || 0,
        price: product.price || '',
        currency: product.currency || 'MXN',
        total_value: product.total_value || '',
        last_updated: product.last_updated || '',
      }));

      // Generate CSV
      const csvContent = convertToCSV(csvData, supplierProductColumns, selectedColumns);
      const timestamp = new Date().toISOString().split('T')[0];
      downloadCSV(csvContent, `inventario_${timestamp}.csv`);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      setError(errorMessage(err, EXPORT_ERROR));
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50">
        <div className="container mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 pt-2 md:pt-20 pb-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50">
      <div className="container mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 pt-2 md:pt-20 pb-8 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Stock</h1>
              <p className="text-gray-600 mt-1">
                Existencias por producto y proveedor. Toca «Cambiar stock» para corregir un número.
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setIsExportModalOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Exportando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Exportar CSV
                  </>
                )}
              </Button>
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
        </div>

                {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <Card className="p-4 md:p-6">
            <div className="flex items-center">
              <div className="hidden sm:block p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-4V8a1 1 0 00-1-1H7a1 1 0 00-1 1v1m0 4h.01" />
                </svg>
              </div>
              <div className="min-w-0 sm:ml-4">
                <p className="text-sm font-medium text-gray-600">Total Productos</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">{products.length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 md:p-6">
            <div className="flex items-center">
              <div className="hidden sm:block p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="min-w-0 sm:ml-4">
                <p className="text-sm font-medium text-gray-600">Con Stock</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">
                  {products.filter(p => p.stock > 0).length}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 md:p-6">
            <div className="flex items-center">
              <div className="hidden sm:block p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="min-w-0 sm:ml-4">
                <p className="text-sm font-medium text-gray-600">Valor Total</p>
                <p className="text-base sm:text-xl md:text-2xl font-bold text-gray-900">
                  {formatCurrency(products.reduce((sum, p) => sum + (p.total_value || 0), 0))}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 md:p-6">
            <div className="flex items-center">
              <div className="hidden sm:block p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="min-w-0 sm:ml-4">
                <p className="text-sm font-medium text-gray-600">Última Actualización</p>
                <p className="text-base md:text-lg font-bold text-gray-900">
                  {formatDateTime(lastInventoryUpdate)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex-1">
              <Input
                type="search"
                placeholder="Buscar por nombre o SKU..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPhoneLimit(PHONE_BATCH); }}
                className="w-full h-11 md:h-9"
              />
            </div>
            <label htmlFor="includeZeroStock" className="flex items-center gap-2 py-1 text-base md:text-sm text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                id="includeZeroStock"
                checked={includeZeroStock}
                onChange={(e) => { setIncludeZeroStock(e.target.checked); setPhoneLimit(PHONE_BATCH); }}
                className="w-5 h-5 md:w-4 md:h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Mostrar productos sin existencia
            </label>
          </div>
        </Card>

        {/* Error Alert (pinned to the bottom on phones so it is seen wherever the edited card is) */}
        {error && (
          <div className="fixed inset-x-3 bottom-4 z-50 shadow-lg md:static md:shadow-none bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <p className="text-base md:text-sm text-red-800">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto -m-2 p-2 shrink-0 text-red-400 hover:text-red-600"
                aria-label="Cerrar aviso"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Stock list: cards on phones, table from md */}
        {isWide ? (
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
                    <SortableHeader column="last_updated">
                      Última Actualización
                    </SortableHeader>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                            inputMode="decimal"
                            value={tempValues[product.id]?.stock ?? ''}
                            onChange={(e) => setTempStock(product.id, e.target.value)}
                            className="w-20"
                            min="0"
                            step="1"
                            aria-label="Stock"
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
                            inputMode="decimal"
                            step="0.01"
                            value={tempValues[product.id]?.price ?? ''}
                            onChange={(e) => setTempValues({
                              ...tempValues,
                              [product.id]: {
                                ...tempValues[product.id],
                                price: e.target.value
                              }
                            })}
                            className="w-28"
                            min="0"
                            aria-label="Costo unitario"
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
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {formatDate(product.last_updated)}
                      </td>
                      <td className="px-4 py-4">
                        {editingProduct === product.id ? (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleEditSave(product.id)}
                              disabled={saving[product.id]}
                              className="bg-green-600 hover:bg-green-700 text-white"
                              aria-label="Guardar"
                              title="Guardar"
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
                              aria-label="Cancelar"
                              title="Cancelar"
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
                            aria-label="Cambiar stock"
                            title="Cambiar stock"
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
              <div className="text-center py-8 px-4 text-gray-500">{emptyMessage}</div>
            )}
          </Card>
        ) : (
          <Card>
            <ul className="divide-y divide-gray-200">
              {phoneProducts.map((product) => {
                const isEditing = editingProduct === product.id;
                const isSaving = !!saving[product.id];
                return (
                  <li key={product.id} className="p-4">
                    <p className="text-base font-medium text-gray-900 leading-snug line-clamp-2">{product.name}</p>
                    <p className="mt-0.5 text-xs text-gray-500 truncate">{product.supplier_name}</p>
                    {isEditing ? (
                      <div className="mt-3">
                        <label htmlFor={`stock-${product.id}`} className="block mb-1 text-sm text-gray-600">
                          Nuevo stock ({product.unit?.toLowerCase()})
                        </label>
                        <Input
                          id={`stock-${product.id}`}
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="1"
                          autoFocus
                          value={tempValues[product.id]?.stock ?? ''}
                          onChange={(e) => setTempStock(product.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditSave(product.id);
                            if (e.key === 'Escape') handleEditCancel(product.id);
                          }}
                          className="h-12 text-lg"
                        />
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <Button
                            onClick={() => handleEditSave(product.id)}
                            disabled={isSaving}
                            className="h-11 text-base bg-green-600 hover:bg-green-700 text-white"
                          >
                            {isSaving ? 'Guardando…' : 'Guardar'}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleEditCancel(product.id)}
                            disabled={isSaving}
                            className="h-11 text-base"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <p className="min-w-0">
                          <span className={`text-3xl font-bold tabular-nums ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {product.stock.toLocaleString('es-MX')}
                          </span>
                          <span className="ml-1.5 text-sm text-gray-500">{product.unit?.toLowerCase()}</span>
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => handleEditStart(product)}
                          className="h-11 px-5 text-base shrink-0 border-blue-200 text-blue-700"
                        >
                          Cambiar stock
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {filteredProducts.length > phoneLimit && (
              <div className="p-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => setPhoneLimit((n) => n + PHONE_BATCH)}
                  className="w-full h-11 text-base"
                >
                  Ver más ({filteredProducts.length - phoneLimit} restantes)
                </Button>
              </div>
            )}

            {filteredProducts.length === 0 && (
              <div className="text-center py-8 px-4 text-base text-gray-500">{emptyMessage}</div>
            )}
          </Card>
        )}
      </div>

      {/* CSV Export Modal */}
      <CSVExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExportCSV}
        columns={supplierProductColumns}
        title="Exportar Inventario a CSV"
      />
    </div>
  );
};

export default StockManagementPage;

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import LoadingSpinner from '../ui/LoadingSpinner';
import { apiRequest } from '../../utils/api';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, HeadingLevel } from 'docx';

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
  product_name?: string;
  supplier_name?: string;
  unit?: string;
  quantity: number;
  unit_price: number;
  shipping_cost: number;
  shipping_type?: 'direct' | 'ocurre';
  total_cost: number;
  margin_percentage?: number;
  selling_price_unit?: number;
  selling_price_total?: number;
  profit_unit?: number;
  profit_total?: number;
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
  // URL parameters and navigation
  const { balanceId } = useParams();
  const navigate = useNavigate();
  
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
  const [comparisonQuantity, setComparisonQuantity] = useState(1);
  const [defaultMargin, setDefaultMargin] = useState(32);
  const [individualMargins, setIndividualMargins] = useState<{[key: number]: number}>({});
  const [sortBy, setSortBy] = useState<string>('importe_venta');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedExportType, setSelectedExportType] = useState<string>('csv');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showBulkOperations, setShowBulkOperations] = useState(false);
  const [bulkMargin, setBulkMargin] = useState<number>(32);
  const [returnToBalance, setReturnToBalance] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const exportTableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInitialData();
    
    // Check if returning from product detail page
    const returnData = localStorage.getItem('returnToBalance');
    if (returnData) {
      try {
        const parsed = JSON.parse(returnData);
        setCurrentPage(parsed.currentPage || 1);
        setSortBy(parsed.sortBy || 'importe_venta');
        setSortOrder(parsed.sortOrder || 'asc');
        setItemsPerPage(parsed.itemsPerPage || 10);
        // Clear the stored data
        localStorage.removeItem('returnToBalance');
      } catch (error) {
        console.error('Error parsing return navigation data:', error);
      }
    }
    
    // Load balance from URL parameter if present
    if (balanceId) {
      const id = parseInt(balanceId, 10);
      if (!isNaN(id)) {
        loadBalance(id);
      }
    }
  }, [balanceId]);

  // Set default sorting for comparison balance and initialize comparison quantity
  useEffect(() => {
    if (currentBalance?.balance_type === 'COMPARISON') {
      setSortBy('importe_venta');
      setSortOrder('asc');
      // Set comparison quantity from first item if available
      if (currentBalance.items && currentBalance.items.length > 0) {
        setComparisonQuantity(currentBalance.items[0].quantity);
      }
    }
  }, [currentBalance?.balance_type, currentBalance?.items]);

  // Initialize selected columns when modal opens
  useEffect(() => {
    if (showExportModal) {
      setSelectedColumns([
        'proveedor', 'producto', 'cantidad', 'unidad', 'tipo_envio',
        'precio_unitario', 'importe_total', 'costo_envio_total',
        'costo_total_u', 'costo_total', 'ganancia_porcentaje',
        'importe_venta_u', 'importe_venta', 'ganancia_u', 'ganancia_t'
      ]);
    }
  }, [showExportModal]);

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
      
      // Update URL to include balance ID
      navigate(`/balance/${balanceId}`, { replace: true });
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

      // Find supplier name from the comparison data
      const supplier = productComparison?.suppliers.find(s => s.supplier_id === supplierId);

      // Use comparison quantity for comparison balances, regular quantity for quotations
      const itemQuantity = currentBalance.balance_type === 'COMPARISON' ? comparisonQuantity : quantity;

      const newItem: BalanceItem = {
        product_id: selectedProduct.id,
        supplier_id: supplierId,
        product_name: selectedProduct.name,
        supplier_name: supplier?.supplier_name || `Supplier ${supplierId}`,
        unit: selectedProduct.unit,
        quantity: itemQuantity,
        unit_price: unitPrice,
        shipping_cost: shippingCost,
        shipping_type: 'direct', // Default to direct
        total_cost: (unitPrice + shippingCost) * itemQuantity,
        margin_percentage: defaultMargin
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
    if (!currentBalance || !currentBalance.items.length) {
      setError('No data available for export');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const headers = [
        'Proveedor',
        'Producto',
        'Cantidad',
        'Unidad',
        'Precio Unitario',
        'Importe Total',
        'Costo Total U',
        'Costo Total',
        'Costo Envío Total',
        'Ganancia %',
        'Importe Venta U',
        'Importe Venta',
        'Ganancia U',
        'Ganancia T'
      ];

      const rows = currentBalance.items.map(item => {
        const values = calculateItemValues(item);
        return [
          item.supplier_name || `Supplier ${item.supplier_id}`,
          item.product_name || `Product ${item.product_id}`,
          item.quantity,
          item.unit || 'pcs',
          item.unit_price,
          item.unit_price * item.quantity,
          item.unit_price + item.shipping_cost,
          item.total_cost,
          item.shipping_cost * item.quantity,
          values.margin,
          values.sellingPriceUnit,
          values.sellingPriceTotal,
          values.profitUnit,
          values.profitTotal
        ];
      });

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
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating CSV:', error);
      setError(`Error generating CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const exportToExcel = () => {
    if (!currentBalance || !currentBalance.items.length) {
      setError('No data available for export');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const headers = [
        'Proveedor', 'Producto', 'Cantidad', 'Unidad', 'Precio Unitario',
        'Importe Total', 'Costo Total U', 'Costo Total', 'Costo Envío Total',
        'Ganancia %', 'Importe Venta U', 'Importe Venta', 'Ganancia U', 'Ganancia T'
      ];

      const rows = currentBalance.items.map(item => {
        const values = calculateItemValues(item);
        return [
          item.supplier_name || `Supplier ${item.supplier_id}`,
          item.product_name || `Product ${item.product_id}`,
          item.quantity, item.unit || 'pcs', item.unit_price,
          item.unit_price * item.quantity, item.unit_price + item.shipping_cost,
          item.total_cost, item.shipping_cost * item.quantity, values.margin,
          values.sellingPriceUnit, values.sellingPriceTotal, values.profitUnit, values.profitTotal
        ];
      });

      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Balance');
      
      XLSX.writeFile(workbook, `${currentBalance.name.replace(/[^a-z0-9]/gi, '_')}.xlsx`);
    } catch (error) {
      console.error('Error generating Excel:', error);
      setError(`Error generating Excel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const exportToPDF = async () => {
    if (!currentBalance || !currentBalance.items.length || !exportTableRef.current) {
      setError('No data available for export');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      // Wait a bit to ensure the table is rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(exportTableRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: exportTableRef.current.scrollWidth,
        height: exportTableRef.current.scrollHeight
      });
      
      // Check if canvas is valid
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas has zero dimensions');
      }
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      
      const imgWidth = 297; // A4 width in mm
      const pageHeight = 210; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`${currentBalance.name.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError(`Error generating PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const exportToImage = async () => {
    if (!currentBalance || !currentBalance.items.length || !exportTableRef.current) {
      setError('No data available for export');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      // Wait a bit to ensure the table is rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(exportTableRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: exportTableRef.current.scrollWidth,
        height: exportTableRef.current.scrollHeight
      });
      
      // Check if canvas is valid
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas has zero dimensions');
      }
      
      const link = document.createElement('a');
      link.download = `${currentBalance.name.replace(/[^a-z0-9]/gi, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error generating image:', error);
      setError(`Error generating image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const exportToWord = async () => {
    if (!currentBalance || !currentBalance.items.length) {
      setError('No data available for export');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const tableRows = currentBalance.items.map(item => {
        const values = calculateItemValues(item);
        return new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(item.supplier_name || `Supplier ${item.supplier_id}`)] }),
            new TableCell({ children: [new Paragraph(item.product_name || `Product ${item.product_id}`)] }),
            new TableCell({ children: [new Paragraph(item.quantity.toString())] }),
            new TableCell({ children: [new Paragraph(item.unit || 'pcs')] }),
            new TableCell({ children: [new Paragraph(item.unit_price.toString())] }),
            new TableCell({ children: [new Paragraph((item.unit_price * item.quantity).toString())] }),
            new TableCell({ children: [new Paragraph((item.shipping_cost * item.quantity).toString())] }),
            new TableCell({ children: [new Paragraph((item.unit_price + item.shipping_cost).toString())] }),
            new TableCell({ children: [new Paragraph(item.total_cost.toString())] }),
            new TableCell({ children: [new Paragraph(values.margin.toString())] }),
            new TableCell({ children: [new Paragraph(values.sellingPriceUnit.toString())] }),
            new TableCell({ children: [new Paragraph(values.sellingPriceTotal.toString())] }),
            new TableCell({ children: [new Paragraph(values.profitUnit.toString())] }),
            new TableCell({ children: [new Paragraph(values.profitTotal.toString())] })
          ]
        });
      });

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: currentBalance.name,
              heading: HeadingLevel.HEADING_1
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph('Proveedor')] }),
                    new TableCell({ children: [new Paragraph('Producto')] }),
                    new TableCell({ children: [new Paragraph('Cantidad')] }),
                    new TableCell({ children: [new Paragraph('Unidad')] }),
                    new TableCell({ children: [new Paragraph('Precio Unitario')] }),
                    new TableCell({ children: [new Paragraph('Importe Total')] }),
                    new TableCell({ children: [new Paragraph('Costo Envío Total')] }),
                    new TableCell({ children: [new Paragraph('Costo Total U')] }),
                    new TableCell({ children: [new Paragraph('Costo Total')] }),
                    new TableCell({ children: [new Paragraph('Ganancia %')] }),
                    new TableCell({ children: [new Paragraph('Importe Venta U')] }),
                    new TableCell({ children: [new Paragraph('Importe Venta')] }),
                    new TableCell({ children: [new Paragraph('Ganancia U')] }),
                    new TableCell({ children: [new Paragraph('Ganancia T')] })
                  ]
                }),
                ...tableRows
              ]
            })
          ]
        }]
      });

      const buffer = await Packer.toBuffer(doc);
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${currentBalance.name.replace(/[^a-z0-9]/gi, '_')}.docx`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating Word document:', error);
      setError(`Error generating Word document: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateSuggestedPrice = (unitCost: number, shippingCost: number, margin?: number) => {
    const totalCost = unitCost + shippingCost;
    const marginToUse = margin !== undefined ? margin : defaultMargin;
    return totalCost * (1 + marginToUse / 100);
  };

  const calculateItemValues = (item: BalanceItem) => {
    const margin = individualMargins[item.product_id] !== undefined ? individualMargins[item.product_id] : defaultMargin;
    
    // Calculate shipping cost based on type
    let effectiveShippingCost = item.shipping_cost;
    if (item.shipping_type === 'ocurre' && currentBalance) {
      // For ocurre, add all shipping costs from all items
      effectiveShippingCost = currentBalance.items.reduce((sum, otherItem) => {
        return sum + (otherItem.shipping_cost * otherItem.quantity);
      }, 0);
    }
    
    const sellingPriceUnit = calculateSuggestedPrice(item.unit_price, effectiveShippingCost, margin);
    const sellingPriceTotal = sellingPriceUnit * item.quantity;
    const profitUnit = sellingPriceUnit - (item.unit_price + effectiveShippingCost);
    const profitTotal = profitUnit * item.quantity;
    
    return {
      margin,
      sellingPriceUnit,
      sellingPriceTotal,
      profitUnit,
      profitTotal,
      effectiveShippingCost
    };
  };

  const updateItemMargin = (productId: number, margin: number) => {
    setIndividualMargins(prev => ({
      ...prev,
      [productId]: margin
    }));
  };

  const updateDefaultMargin = (margin: number) => {
    setDefaultMargin(margin);
    // Clear individual margins when default changes
    setIndividualMargins({});
  };

  const updateComparisonQuantity = async (newQuantity: number) => {
    if (!currentBalance || currentBalance.balance_type !== 'COMPARISON') return;

    try {
      setSaving(true);
      setError(null);

      const updatedItems = currentBalance.items.map(item => ({
        ...item,
        quantity: newQuantity,
        total_cost: (item.unit_price + item.shipping_cost) * newQuantity
      }));

      const updateData = {
        items: updatedItems
      };

      const response = await apiRequest(`/balance/${currentBalance.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      setCurrentBalance(response);
      setComparisonQuantity(newQuantity);
      
      // Update the balance in the list
      setBalances(prev => 
        prev.map(b => b.id === currentBalance.id ? response : b)
      );
    } catch (err: any) {
      console.error('Error updating comparison quantity:', err);
      setError(err.message || 'Error updating quantity');
    } finally {
      setSaving(false);
    }
  };

  const sortItems = (items: BalanceItem[]) => {
    return [...items].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'product_name':
          aValue = a.product_name || '';
          bValue = b.product_name || '';
          break;
        case 'supplier_name':
          aValue = a.supplier_name || '';
          bValue = b.supplier_name || '';
          break;
        case 'cantidad':
          aValue = a.quantity;
          bValue = b.quantity;
          break;
        case 'precio_unitario':
          aValue = a.unit_price;
          bValue = b.unit_price;
          break;
        case 'costo_total':
          aValue = a.total_cost;
          bValue = b.total_cost;
          break;
        case 'envio':
          aValue = a.shipping_cost;
          bValue = b.shipping_cost;
          break;
        case 'ganancia':
          const aValues = calculateItemValues(a);
          const bValues = calculateItemValues(b);
          aValue = aValues.profitTotal;
          bValue = bValues.profitTotal;
          break;
        case 'importe_venta':
        default:
          const aVals = calculateItemValues(a);
          const bVals = calculateItemValues(b);
          aValue = aVals.sellingPriceTotal;
          bValue = bVals.sellingPriceTotal;
          break;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });
  };

  // Pagination functions
  const getPaginatedItems = () => {
    const sortedItems = sortItems(currentBalance?.items || []);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedItems.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil((currentBalance?.items?.length || 0) / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Clear selections when changing pages
    setSelectedItems(new Set());
    setShowBulkOperations(false);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
    // Clear selections when changing items per page
    setSelectedItems(new Set());
    setShowBulkOperations(false);
  };

  // Simple bulk operations functions - using simple index-based keys
  const getItemKey = (item: BalanceItem) => `${item.product_id}-${item.supplier_id}`;

  const handleItemSelection = (itemKey: string, isSelected: boolean) => {
    const newSelectedItems = new Set(selectedItems);
    if (isSelected) {
      newSelectedItems.add(itemKey);
    } else {
      newSelectedItems.delete(itemKey);
    }
    setSelectedItems(newSelectedItems);
    setShowBulkOperations(newSelectedItems.size > 0);
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      const allItemKeys = new Set(getPaginatedItems().map(item => getItemKey(item)));
      setSelectedItems(allItemKeys);
    } else {
      setSelectedItems(new Set());
    }
    setShowBulkOperations(isSelected);
  };

  const isAllSelected = () => {
    const paginatedItems = getPaginatedItems();
    return paginatedItems.length > 0 && paginatedItems.every(item => selectedItems.has(getItemKey(item)));
  };

  const isIndeterminate = () => {
    const paginatedItems = getPaginatedItems();
    const selectedCount = paginatedItems.filter(item => selectedItems.has(getItemKey(item))).length;
    return selectedCount > 0 && selectedCount < paginatedItems.length;
  };

  const bulkDeleteItems = async () => {
    if (!currentBalance || selectedItems.size === 0) return;

    try {
      setSaving(true);
      setError(null);

      const updatedItems = currentBalance.items.filter(item => !selectedItems.has(getItemKey(item)));

      const updateData = {
        items: updatedItems
      };

      const response = await apiRequest(`/balance/${currentBalance.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      setCurrentBalance(response);
      setSelectedItems(new Set());
      setShowBulkOperations(false);
      
      // Update the balance in the list
      setBalances(prev => 
        prev.map(b => b.id === currentBalance.id ? response : b)
      );
    } catch (err: any) {
      console.error('Error bulk deleting items:', err);
      setError(err.message || 'Error deleting selected items');
    } finally {
      setSaving(false);
    }
  };

  const bulkUpdateMargins = async () => {
    if (!currentBalance || selectedItems.size === 0) return;

    try {
      setSaving(true);
      setError(null);

      const updatedItems = currentBalance.items.map(item => {
        if (selectedItems.has(getItemKey(item))) {
          return { ...item, margin_percentage: bulkMargin };
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
      setSelectedItems(new Set());
      setShowBulkOperations(false);
      
      // Update individual margins state
      const newIndividualMargins = { ...individualMargins };
      currentBalance.items.forEach(item => {
        if (selectedItems.has(getItemKey(item))) {
          newIndividualMargins[item.product_id] = bulkMargin;
        }
      });
      setIndividualMargins(newIndividualMargins);
      
      // Update the balance in the list
      setBalances(prev => 
        prev.map(b => b.id === currentBalance.id ? response : b)
      );
    } catch (err: any) {
      console.error('Error bulk updating margins:', err);
      setError(err.message || 'Error updating margins for selected items');
    } finally {
      setSaving(false);
    }
  };

  const navigateToProduct = (productId: number) => {
    // Store current balance ID for return navigation
    setReturnToBalance(currentBalance?.id?.toString() || null);
    
    // Store current state in localStorage for persistence
    if (currentBalance) {
      localStorage.setItem('returnToBalance', JSON.stringify({
        balanceId: currentBalance.id,
        currentPage,
        sortBy,
        sortOrder,
        itemsPerPage
      }));
    }
    
    // Navigate to product detail page
    window.location.href = `/product-admin/${productId}`;
  };

  // Sort handler function (consistent with other pages)
  const handleSortChange = (field: string) => {
    if (sortBy === field) {
      // Toggle order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with asc as default
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 px-4">
      <div className="w-full max-w-none mx-auto">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 px-4">
      <div className="max-w-full mx-auto space-y-6 px-2">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Balance de Productos</h1>
              <p className="text-gray-600 mt-1">
                Gestiona y compara cotizaciones de productos
              </p>
            </div>
            {!currentBalance && (
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
            )}
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
                      onClick={() => {
                        setCurrentBalance(null);
                        navigate('/balance', { replace: true });
                      }}
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
                        onClick={() => setShowExportModal(true)}
                      variant="outline"
                      className="border-green-300 text-green-700 hover:bg-green-50"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                        Exportar
                    </Button>
                  )}
                </div>
              </div>

              {/* Balance Summary */}
              <div className={`mt-6 grid grid-cols-1 gap-4 ${
                currentBalance.balance_type === 'COMPARISON' ? 'md:grid-cols-4' : 'md:grid-cols-5'
              }`}>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600">Total de Productos</p>
                  <p className="text-2xl font-bold text-blue-700">{currentBalance.items?.length || 0}</p>
                </div>
                {/* Only show Monto Total for QUOTATION balances */}
                {currentBalance.balance_type === 'QUOTATION' && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600">Monto Total</p>
                  <p className="text-2xl font-bold text-green-700">{formatCurrency(currentBalance.total_amount)}</p>
                </div>
                )}
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
                        onChange={(e) => updateDefaultMargin(parseFloat(e.target.value) || 0)}
                      className="w-20 text-lg font-bold"
                      min="0"
                      step="1"
                    />
                    <span className="text-lg font-bold text-gray-700">%</span>
                  </div>
                </div>
                {currentBalance.balance_type === 'COMPARISON' && (
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-orange-600">Cantidad para Comparación</p>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        value={comparisonQuantity}
                        onChange={(e) => updateComparisonQuantity(parseInt(e.target.value) || 1)}
                        className="w-20 text-lg font-bold"
                        min="1"
                        step="1"
                        disabled={saving}
                      />
                      <span className="text-lg font-bold text-orange-700">unidades</span>
                    </div>
                  </div>
                )}
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
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Productos en el Balance</h3>
                  
                  {/* Sort Controls - Consistent with other pages */}
                  <Card className="p-4 mb-6 shadow-sm border-0 rounded-xl bg-gradient-to-r from-gray-50 to-blue-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                        <span className="text-sm font-medium text-gray-700">Ordenar por:</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          variant={sortBy === 'importe_venta' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleSortChange('importe_venta')}
                          className={`text-xs font-medium transition-all duration-200 ${sortBy === 'importe_venta' ? 'shadow-md' : ''}`}
                        >
                          <span>Importe Venta</span>
                          {sortBy === 'importe_venta' && (
                            <span className="ml-1 text-xs">
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </Button>
                        <Button
                          variant={sortBy === 'product_name' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleSortChange('product_name')}
                          className={`text-xs font-medium transition-all duration-200 ${sortBy === 'product_name' ? 'shadow-md' : ''}`}
                        >
                          <span>Producto</span>
                          {sortBy === 'product_name' && (
                            <span className="ml-1 text-xs">
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </Button>
                        <Button
                          variant={sortBy === 'supplier_name' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleSortChange('supplier_name')}
                          className={`text-xs font-medium transition-all duration-200 ${sortBy === 'supplier_name' ? 'shadow-md' : ''}`}
                        >
                          <span>Proveedor</span>
                          {sortBy === 'supplier_name' && (
                            <span className="ml-1 text-xs">
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </Button>
                        <Button
                          variant={sortBy === 'cantidad' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleSortChange('cantidad')}
                          className={`text-xs font-medium transition-all duration-200 ${sortBy === 'cantidad' ? 'shadow-md' : ''}`}
                        >
                          <span>Cantidad</span>
                          {sortBy === 'cantidad' && (
                            <span className="ml-1 text-xs">
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </Button>
                        <Button
                          variant={sortBy === 'precio_unitario' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleSortChange('precio_unitario')}
                          className={`text-xs font-medium transition-all duration-200 ${sortBy === 'precio_unitario' ? 'shadow-md' : ''}`}
                        >
                          <span>Precio Unitario</span>
                          {sortBy === 'precio_unitario' && (
                            <span className="ml-1 text-xs">
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </Button>
                        <Button
                          variant={sortBy === 'costo_total' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleSortChange('costo_total')}
                          className={`text-xs font-medium transition-all duration-200 ${sortBy === 'costo_total' ? 'shadow-md' : ''}`}
                        >
                          <span>Costo Total</span>
                          {sortBy === 'costo_total' && (
                            <span className="ml-1 text-xs">
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </Button>
                        <Button
                          variant={sortBy === 'ganancia' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleSortChange('ganancia')}
                          className={`text-xs font-medium transition-all duration-200 ${sortBy === 'ganancia' ? 'shadow-md' : ''}`}
                        >
                          <span>Ganancia</span>
                          {sortBy === 'ganancia' && (
                            <span className="ml-1 text-xs">
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Bulk Operations Bar */}
                {showBulkOperations && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium text-blue-800">
                          {selectedItems.size} elemento(s) seleccionado(s)
                        </span>
                        <div className="flex items-center space-x-2">
                          <label className="text-sm text-blue-700">Margen:</label>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={bulkMargin}
                            onChange={(e) => setBulkMargin(parseFloat(e.target.value) || 0)}
                            className="w-20 text-sm"
                          />
                          <span className="text-sm text-blue-700">%</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={bulkUpdateMargins}
                          disabled={saving}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1"
                        >
                          {saving ? 'Actualizando...' : 'Actualizar Margen'}
                        </Button>
                        <Button
                          onClick={bulkDeleteItems}
                          disabled={saving}
                          variant="outline"
                          className="border-red-300 text-red-700 hover:bg-red-50 text-sm px-3 py-1"
                        >
                          {saving ? 'Eliminando...' : 'Eliminar Seleccionados'}
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedItems(new Set());
                            setShowBulkOperations(false);
                          }}
                          variant="ghost"
                          className="text-blue-700 hover:bg-blue-100 text-sm px-3 py-1"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Desktop Table View */}
                <div className="hidden xl:block overflow-x-auto" ref={tableRef}>
                  <table className="w-full text-sm table-auto">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-2 py-3 text-center w-[3%]">
                          <input
                            type="checkbox"
                            checked={isAllSelected()}
                            ref={(input) => {
                              if (input) input.indeterminate = isIndeterminate();
                            }}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="rounded border-gray-300"
                          />
                        </th>
                        <th className="px-2 py-3 text-left w-[10%]">Proveedor</th>
                        <th className="px-2 py-3 text-left w-[12%]">Producto</th>
                        <th className="px-2 py-3 text-right w-[6%]">
                          Cantidad
                          {currentBalance.balance_type === 'COMPARISON' && (
                            <div className="text-xs text-orange-600 font-normal">(Controlada arriba)</div>
                          )}
                        </th>
                        <th className="px-2 py-3 text-center w-[5%]">Unidad</th>
                        <th className="px-2 py-3 text-center w-[6%]">Tipo Envío</th>
                        {currentBalance.items.some(item => item.quantity > 1) ? (
                          <>
                            <th className="px-2 py-3 text-right w-[6%]">Precio Unitario</th>
                            <th className="px-2 py-3 text-right w-[6%]">Importe Total</th>
                          </>
                        ) : (
                          <th className="px-2 py-3 text-right w-[10%]">Precio</th>
                        )}
                        <th className="px-2 py-3 text-right w-[5%]">Envio</th>
                        {currentBalance.items.some(item => item.quantity > 1) ? (
                          <>
                            <th className="px-2 py-3 text-right w-[6%]">Costo Total U</th>
                            <th className="px-2 py-3 text-right w-[6%]">Costo Total</th>
                          </>
                        ) : (
                          <th className="px-2 py-3 text-right w-[10%]">Costo</th>
                        )}
                        <th className="px-2 py-3 text-center w-[5%]">Ganancia %</th>
                        {currentBalance.items.some(item => item.quantity > 1) ? (
                          <>
                            <th className="px-2 py-3 text-right w-[6%]">Importe Venta U</th>
                            <th className="px-2 py-3 text-right w-[6%]">Importe Venta</th>
                          </>
                        ) : (
                          <th className="px-2 py-3 text-right w-[10%]">Importe Venta</th>
                        )}
                        {currentBalance.items.some(item => item.quantity > 1) ? (
                          <>
                            <th className="px-2 py-3 text-right w-[6%]">Ganancia U</th>
                            <th className="px-2 py-3 text-right w-[6%]">Ganancia T</th>
                          </>
                        ) : (
                          <th className="px-2 py-3 text-right w-[10%]">Ganancia</th>
                        )}
                        <th className="px-2 py-3 text-center w-[4%]">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedItems().map((item, sortedIndex) => {
                        const values = calculateItemValues(item);
                        const hasMultipleQuantity = item.quantity > 1;
                        
                        // Find the original index in the unsorted array - simple approach
                        const originalIndex = currentBalance.items.findIndex(originalItem => 
                          originalItem.product_id === item.product_id && 
                          originalItem.supplier_id === item.supplier_id
                        );
                        
                        // Color mapping for comparison balance
                        const isComparison = currentBalance.balance_type === 'COMPARISON';
                        const isBestOption = isComparison && sortedIndex === 0 && sortBy === 'importe_venta' && sortOrder === 'asc';
                        const isSecondBest = isComparison && sortedIndex === 1 && sortBy === 'importe_venta' && sortOrder === 'asc';
                        
                        let rowClass = "border-b hover:bg-gray-50";
                        if (isBestOption) {
                          rowClass += " bg-green-50 border-green-200";
                        } else if (isSecondBest) {
                          rowClass += " bg-yellow-50 border-yellow-200";
                        }
                        
                        const itemKey = getItemKey(item);
                        
                        return (
                          <tr key={itemKey} className={rowClass}>
                            <td className="px-2 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={selectedItems.has(itemKey)}
                                onChange={(e) => handleItemSelection(itemKey, e.target.checked)}
                                className="rounded border-gray-300"
                              />
                            </td>
                            <td className="px-2 py-3">{item.supplier_name || `Supplier ${item.supplier_id}`}</td>
                            <td className="px-2 py-3">
                              <button
                                onClick={() => navigateToProduct(item.product_id)}
                                className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-left"
                              >
                                {item.product_name || `Product ${item.product_id}`}
                              </button>
                            </td>
                          <td className="px-2 py-3 text-right">
                            {currentBalance.balance_type === 'COMPARISON' ? (
                              <div className="w-20 text-right px-3 py-2 bg-gray-100 border border-gray-300 rounded text-gray-600 font-medium">
                                {item.quantity}
                              </div>
                            ) : (
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                                onChange={(e) => updateBalanceItem(originalIndex, { quantity: parseInt(e.target.value) || 1 })}
                              className="w-20 text-right"
                            />
                            )}
                          </td>
                            <td className="px-2 py-3 text-center">{item.unit || 'pcs'}</td>
                            <td className="px-2 py-3 text-center">
                              <select
                                value={item.shipping_type || 'direct'}
                                onChange={(e) => updateBalanceItem(originalIndex, { shipping_type: e.target.value as 'direct' | 'ocurre' })}
                                className="text-xs border border-gray-300 rounded px-1 py-1"
                              >
                                <option value="direct">Direct</option>
                                <option value="ocurre">Ocurre</option>
                              </select>
                            </td>
                            
                            {hasMultipleQuantity ? (
                              <>
                          <td className="px-2 py-3 text-right">{formatCurrency(item.unit_price)}</td>
                                <td className="px-2 py-3 text-right">{formatCurrency(item.unit_price * item.quantity)}</td>
                              </>
                            ) : (
                              <td className="px-2 py-3 text-right">{formatCurrency(item.unit_price)}</td>
                            )}
                            
                            <td className="px-2 py-3 text-right">{formatCurrency(values.effectiveShippingCost * item.quantity)}</td>
                            
                            {hasMultipleQuantity ? (
                              <>
                                <td className="px-2 py-3 text-right">{formatCurrency(item.unit_price + values.effectiveShippingCost)}</td>
                                <td className="px-2 py-3 text-right">{formatCurrency(item.total_cost)}</td>
                              </>
                            ) : (
                              <td className="px-2 py-3 text-right">{formatCurrency(item.unit_price + values.effectiveShippingCost)}</td>
                            )}
                            
                            <td className="px-2 py-3 text-center">
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                value={values.margin}
                                onChange={(e) => updateItemMargin(item.product_id, parseFloat(e.target.value) || 0)}
                                className="w-16 text-center"
                              />
                            </td>
                            
                            {hasMultipleQuantity ? (
                              <>
                                <td className="px-2 py-3 text-right">{formatCurrency(values.sellingPriceUnit)}</td>
                                <td className="px-2 py-3 text-right">{formatCurrency(values.sellingPriceTotal)}</td>
                              </>
                            ) : (
                              <td className="px-2 py-3 text-right">{formatCurrency(values.sellingPriceUnit)}</td>
                            )}
                            
                            {hasMultipleQuantity ? (
                              <>
                                <td className="px-2 py-3 text-right">{formatCurrency(values.profitUnit)}</td>
                                <td className="px-2 py-3 text-right">{formatCurrency(values.profitTotal)}</td>
                              </>
                            ) : (
                              <td className="px-2 py-3 text-right">{formatCurrency(values.profitUnit)}</td>
                            )}
                            
                          <td className="px-2 py-3 text-center">
                            <Button
                              variant="ghost"
                                onClick={() => removeBalanceItem(originalIndex)}
                              disabled={saving}
                              className="text-red-600 hover:text-red-800 p-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </Button>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                    {currentBalance.balance_type === 'QUOTATION' && (
                      <tfoot>
                        <tr className="bg-gray-100 font-bold">
                          <td className="px-2 py-3"></td>
                          <td className="px-2 py-3" colSpan={2}>TOTALES</td>
                          <td className="px-2 py-3 text-right">
                            {currentBalance.items.reduce((sum, item) => sum + item.quantity, 0)}
                          </td>
                          <td className="px-2 py-3"></td>
                          <td className="px-2 py-3"></td>
                          {currentBalance.items.some(item => item.quantity > 1) ? (
                            <>
                              <td className="px-2 py-3 text-right">
                                {formatCurrency(currentBalance.items.reduce((sum, item) => sum + item.unit_price, 0))}
                              </td>
                              <td className="px-2 py-3 text-right">
                                {formatCurrency(currentBalance.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0))}
                              </td>
                            </>
                          ) : (
                            <td className="px-2 py-3 text-right">
                              {formatCurrency(currentBalance.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0))}
                            </td>
                          )}
                          <td className="px-2 py-3 text-right">
                            {formatCurrency(currentBalance.items.reduce((sum, item) => sum + (item.shipping_cost * item.quantity), 0))}
                          </td>
                          {currentBalance.items.some(item => item.quantity > 1) ? (
                            <>
                              <td className="px-2 py-3 text-right">
                                {formatCurrency(currentBalance.items.reduce((sum, item) => sum + (item.unit_price + item.shipping_cost), 0))}
                              </td>
                              <td className="px-2 py-3 text-right">
                                {formatCurrency(currentBalance.items.reduce((sum, item) => sum + item.total_cost, 0))}
                              </td>
                            </>
                          ) : (
                            <td className="px-2 py-3 text-right">
                              {formatCurrency(currentBalance.items.reduce((sum, item) => sum + item.total_cost, 0))}
                            </td>
                          )}
                          <td className="px-2 py-3"></td>
                          {currentBalance.items.some(item => item.quantity > 1) ? (
                            <>
                              <td className="px-2 py-3 text-right">
                                {formatCurrency(currentBalance.items.reduce((sum, item) => {
                                  const values = calculateItemValues(item);
                                  return sum + values.sellingPriceUnit;
                                }, 0))}
                              </td>
                              <td className="px-2 py-3 text-right">
                                {formatCurrency(currentBalance.items.reduce((sum, item) => {
                                  const values = calculateItemValues(item);
                                  return sum + values.sellingPriceTotal;
                                }, 0))}
                              </td>
                            </>
                          ) : (
                            <td className="px-2 py-3 text-right">
                              {formatCurrency(currentBalance.items.reduce((sum, item) => {
                                const values = calculateItemValues(item);
                                return sum + values.sellingPriceTotal;
                              }, 0))}
                            </td>
                          )}
                          {currentBalance.items.some(item => item.quantity > 1) ? (
                            <>
                              <td className="px-2 py-3 text-right">
                                {formatCurrency(currentBalance.items.reduce((sum, item) => {
                                  const values = calculateItemValues(item);
                                  return sum + values.profitUnit;
                                }, 0))}
                              </td>
                              <td className="px-2 py-3 text-right">
                                {formatCurrency(currentBalance.items.reduce((sum, item) => {
                                  const values = calculateItemValues(item);
                                  return sum + values.profitTotal;
                                }, 0))}
                              </td>
                            </>
                          ) : (
                            <td className="px-2 py-3 text-right">
                              {formatCurrency(currentBalance.items.reduce((sum, item) => {
                                const values = calculateItemValues(item);
                                return sum + values.profitTotal;
                              }, 0))}
                            </td>
                          )}
                          <td className="px-2 py-3"></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="xl:hidden space-y-4">
                  {getPaginatedItems().map((item, sortedIndex) => {
                    const values = calculateItemValues(item);
                    const hasMultipleQuantity = item.quantity > 1;
                    
                    // Find the original index in the unsorted array
                    const originalIndex = currentBalance.items.findIndex(originalItem => 
                      originalItem.product_id === item.product_id && 
                      originalItem.supplier_id === item.supplier_id
                    );
                    
                    // Color mapping for comparison balance
                    const isComparison = currentBalance.balance_type === 'COMPARISON';
                    const isBestOption = isComparison && sortedIndex === 0 && sortBy === 'importe_venta' && sortOrder === 'asc';
                    const isSecondBest = isComparison && sortedIndex === 1 && sortBy === 'importe_venta' && sortOrder === 'asc';
                    
                    let cardClass = "bg-white border rounded-lg p-4 shadow-sm";
                    if (isBestOption) {
                      cardClass += " border-green-300 bg-green-50";
                    } else if (isSecondBest) {
                      cardClass += " border-yellow-300 bg-yellow-50";
                    }
                    
                    const itemKey = getItemKey(item);
                    
                    return (
                      <div key={itemKey} className={cardClass}>
                        {/* Card Header */}
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={selectedItems.has(itemKey)}
                              onChange={(e) => handleItemSelection(itemKey, e.target.checked)}
                              className="rounded border-gray-300"
                            />
                            <div>
                              <h3 className="font-semibold text-gray-900">{item.product_name || `Product ${item.product_id}`}</h3>
                              <p className="text-sm text-gray-600">{item.supplier_name || `Supplier ${item.supplier_id}`}</p>
                            </div>
                          </div>
                          {isBestOption && (
                            <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                              Mejor Opción
                            </span>
                          )}
                          {isSecondBest && (
                            <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">
                              Segunda Opción
                            </span>
                          )}
                        </div>

                        {/* Card Content */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wide">Cantidad</label>
                            {currentBalance.balance_type === 'COMPARISON' ? (
                              <div className="text-sm font-medium text-gray-900">{item.quantity} {item.unit || 'pcs'}</div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateBalanceItem(originalIndex, { quantity: parseInt(e.target.value) || 1 })}
                                  className="w-16 text-sm"
                                />
                                <span className="text-sm text-gray-600">{item.unit || 'pcs'}</span>
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wide">Tipo Envío</label>
                            <select
                              value={item.shipping_type || 'direct'}
                              onChange={(e) => updateBalanceItem(originalIndex, { shipping_type: e.target.value as 'direct' | 'ocurre' })}
                              className="text-sm border border-gray-300 rounded px-2 py-1 w-full"
                            >
                              <option value="direct">Direct</option>
                              <option value="ocurre">Ocurre</option>
                            </select>
                          </div>
                        </div>

                        {/* Pricing Information */}
                        <div className="grid grid-cols-1 gap-3 mb-4">
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-sm text-gray-600">Precio Unitario:</span>
                            <span className="font-medium">{formatCurrency(item.unit_price)}</span>
                          </div>
                          {hasMultipleQuantity && (
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-sm text-gray-600">Importe Total:</span>
                              <span className="font-medium">{formatCurrency(item.unit_price * item.quantity)}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-sm text-gray-600">Costo Envío:</span>
                            <span className="font-medium">{formatCurrency(values.effectiveShippingCost * item.quantity)}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-sm text-gray-600">Costo Total:</span>
                            <span className="font-medium">{formatCurrency(item.total_cost)}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-sm text-gray-600">Margen:</span>
                            <div className="flex items-center space-x-2">
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                value={values.margin}
                                onChange={(e) => updateItemMargin(item.product_id, parseFloat(e.target.value) || 0)}
                                className="w-16 text-sm text-center"
                              />
                              <span className="text-sm text-gray-600">%</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-sm text-gray-600">Precio Final:</span>
                            <span className="font-bold text-lg text-green-700">{formatCurrency(values.sellingPriceTotal)}</span>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-gray-600">Ganancia Total:</span>
                            <span className="font-medium text-blue-700">{formatCurrency(values.profitTotal)}</span>
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigateToProduct(item.product_id)}
                            className="text-blue-600 border-blue-300 hover:bg-blue-50"
                          >
                            Ver Detalle
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBalanceItem(originalIndex)}
                            disabled={saving}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Pagination Controls */}
                <div className="flex justify-between items-center mt-4 px-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Mostrar:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span className="text-sm text-gray-600">elementos</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      Página {currentPage} de {totalPages} ({currentBalance.items?.length || 0} elementos)
                    </span>
                    
                    <div className="flex space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-2 py-1"
                      >
                        ←
                      </Button>
                      
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                        if (pageNum > totalPages) return null;
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className="px-2 py-1"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-2 py-1"
                      >
                        →
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Hidden export table without actions column */}
                <div className="fixed -left-[9999px] -top-[9999px] opacity-0 pointer-events-none bg-white" ref={exportTableRef}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-2 py-3 text-left">Proveedor</th>
                        <th className="px-2 py-3 text-left">Producto</th>
                        <th className="px-2 py-3 text-right">Cantidad</th>
                        <th className="px-2 py-3 text-center">Unidad</th>
                        <th className="px-2 py-3 text-center">Tipo Envío</th>
                        {currentBalance.items.some(item => item.quantity > 1) ? (
                          <>
                            <th className="px-2 py-3 text-right">Precio Unitario</th>
                            <th className="px-2 py-3 text-right">Importe Total</th>
                          </>
                        ) : (
                          <th className="px-2 py-3 text-right">Precio</th>
                        )}
                        <th className="px-2 py-3 text-right">Envio</th>
                        {currentBalance.items.some(item => item.quantity > 1) ? (
                          <>
                            <th className="px-2 py-3 text-right">Costo Total U</th>
                            <th className="px-2 py-3 text-right">Costo Total</th>
                          </>
                        ) : (
                          <th className="px-2 py-3 text-right">Costo</th>
                        )}
                        <th className="px-2 py-3 text-right">Ganancia %</th>
                        {currentBalance.items.some(item => item.quantity > 1) ? (
                          <>
                            <th className="px-2 py-3 text-right">Importe Venta U</th>
                            <th className="px-2 py-3 text-right">Importe Venta</th>
                          </>
                        ) : (
                          <th className="px-2 py-3 text-right">Importe Venta</th>
                        )}
                        {currentBalance.items.some(item => item.quantity > 1) ? (
                          <>
                            <th className="px-2 py-3 text-right">Ganancia U</th>
                            <th className="px-2 py-3 text-right">Ganancia T</th>
                          </>
                        ) : (
                          <th className="px-2 py-3 text-right">Ganancia</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {sortItems(currentBalance.items).map((item, index) => {
                        const values = calculateItemValues(item);
                        const hasMultipleQuantity = item.quantity > 1;
                        
                        return (
                          <tr key={index} className="border-b">
                            <td className="px-2 py-3">{item.supplier_name || `Supplier ${item.supplier_id}`}</td>
                            <td className="px-2 py-3">{item.product_name || `Product ${item.product_id}`}</td>
                            <td className="px-2 py-3 text-right">{item.quantity}</td>
                            <td className="px-2 py-3 text-center">{item.unit || 'pcs'}</td>
                            <td className="px-2 py-3 text-center">{item.shipping_type || 'direct'}</td>
                            
                            {hasMultipleQuantity ? (
                              <>
                                <td className="px-2 py-3 text-right">{formatCurrency(item.unit_price)}</td>
                                <td className="px-2 py-3 text-right">{formatCurrency(item.unit_price * item.quantity)}</td>
                              </>
                            ) : (
                              <td className="px-2 py-3 text-right">{formatCurrency(item.unit_price)}</td>
                            )}
                            
                            <td className="px-2 py-3 text-right">{formatCurrency(values.effectiveShippingCost * item.quantity)}</td>
                            
                            {hasMultipleQuantity ? (
                              <>
                                <td className="px-2 py-3 text-right">{formatCurrency(item.unit_price + values.effectiveShippingCost)}</td>
                                <td className="px-2 py-3 text-right">{formatCurrency(item.total_cost)}</td>
                              </>
                            ) : (
                              <td className="px-2 py-3 text-right">{formatCurrency(item.unit_price + values.effectiveShippingCost)}</td>
                            )}
                            
                            <td className="px-2 py-3 text-right">{values.margin}%</td>
                            
                            {hasMultipleQuantity ? (
                              <>
                                <td className="px-2 py-3 text-right">{formatCurrency(values.sellingPriceUnit)}</td>
                                <td className="px-2 py-3 text-right">{formatCurrency(values.sellingPriceTotal)}</td>
                              </>
                            ) : (
                              <td className="px-2 py-3 text-right">{formatCurrency(values.sellingPriceUnit)}</td>
                            )}
                            
                            {hasMultipleQuantity ? (
                              <>
                                <td className="px-2 py-3 text-right">{formatCurrency(values.profitUnit)}</td>
                                <td className="px-2 py-3 text-right">{formatCurrency(values.profitTotal)}</td>
                              </>
                            ) : (
                              <td className="px-2 py-3 text-right">{formatCurrency(values.profitUnit)}</td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                    {currentBalance.balance_type === 'QUOTATION' && (
                      <tfoot>
                        <tr className="bg-gray-100 font-bold">
                          <td className="px-2 py-3" colSpan={3}>TOTALES</td>
                          <td className="px-2 py-3 text-right">
                            {currentBalance.items.reduce((sum, item) => sum + item.quantity, 0)}
                          </td>
                          <td className="px-2 py-3"></td>
                          {currentBalance.items.some(item => item.quantity > 1) ? (
                            <>
                              <td className="px-2 py-3 text-right">
                                {formatCurrency(currentBalance.items.reduce((sum, item) => sum + item.unit_price, 0))}
                              </td>
                              <td className="px-2 py-3 text-right">
                                {formatCurrency(currentBalance.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0))}
                              </td>
                            </>
                          ) : (
                            <td className="px-2 py-3 text-right">
                              {formatCurrency(currentBalance.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0))}
                            </td>
                          )}
                          <td className="px-2 py-3 text-right">
                            {formatCurrency(currentBalance.items.reduce((sum, item) => sum + (item.shipping_cost * item.quantity), 0))}
                          </td>
                          {currentBalance.items.some(item => item.quantity > 1) ? (
                            <>
                              <td className="px-2 py-3 text-right">
                                {formatCurrency(currentBalance.items.reduce((sum, item) => sum + (item.unit_price + item.shipping_cost), 0))}
                              </td>
                              <td className="px-2 py-3 text-right">
                                {formatCurrency(currentBalance.items.reduce((sum, item) => sum + item.total_cost, 0))}
                              </td>
                            </>
                          ) : (
                            <td className="px-2 py-3 text-right">
                              {formatCurrency(currentBalance.items.reduce((sum, item) => sum + item.total_cost, 0))}
                            </td>
                          )}
                          <td className="px-2 py-3"></td>
                          {currentBalance.items.some(item => item.quantity > 1) ? (
                            <>
                              <td className="px-2 py-3 text-right">
                                {formatCurrency(currentBalance.items.reduce((sum, item) => {
                                  const values = calculateItemValues(item);
                                  return sum + values.sellingPriceUnit;
                                }, 0))}
                              </td>
                              <td className="px-2 py-3 text-right">
                                {formatCurrency(currentBalance.items.reduce((sum, item) => {
                                  const values = calculateItemValues(item);
                                  return sum + values.sellingPriceTotal;
                                }, 0))}
                              </td>
                            </>
                          ) : (
                            <td className="px-2 py-3 text-right">
                              {formatCurrency(currentBalance.items.reduce((sum, item) => {
                                const values = calculateItemValues(item);
                                return sum + values.sellingPriceTotal;
                              }, 0))}
                            </td>
                          )}
                          {currentBalance.items.some(item => item.quantity > 1) ? (
                            <>
                              <td className="px-2 py-3 text-right">
                                {formatCurrency(currentBalance.items.reduce((sum, item) => {
                                  const values = calculateItemValues(item);
                                  return sum + values.profitUnit;
                                }, 0))}
                              </td>
                              <td className="px-2 py-3 text-right">
                                {formatCurrency(currentBalance.items.reduce((sum, item) => {
                                  const values = calculateItemValues(item);
                                  return sum + values.profitTotal;
                                }, 0))}
                              </td>
                            </>
                          ) : (
                            <td className="px-2 py-3 text-right">
                              {formatCurrency(currentBalance.items.reduce((sum, item) => {
                                const values = calculateItemValues(item);
                                return sum + values.profitTotal;
                              }, 0))}
                            </td>
                          )}
                        </tr>
                      </tfoot>
                    )}
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

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="p-6 w-full max-w-2xl mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Exportar Balance</h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowExportModal(false)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>

              <div className="space-y-6">
                {/* Export Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Exportación
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'csv', label: 'CSV', icon: '📊' },
                      { value: 'excel', label: 'Excel', icon: '📈' },
                      { value: 'pdf', label: 'PDF', icon: '📄' },
                      { value: 'image', label: 'Imagen', icon: '🖼️' },
                      { value: 'word', label: 'Word', icon: '📝' }
                    ].map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setSelectedExportType(type.value)}
                        className={`p-3 border rounded-lg text-left transition-colors ${
                          selectedExportType === type.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-lg mr-2">{type.icon}</span>
                        <span className="font-medium">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Column Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Seleccionar Columnas para Exportar
                  </label>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Customer-Facing Columns */}
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {currentBalance?.balance_type === 'COMPARISON' 
                          ? 'Para Decisión de Compra (Comparación)' 
                          : 'Para Cliente (Cotización)'
                        }
                      </h4>
                      <div className="space-y-2">
                        {(currentBalance?.balance_type === 'COMPARISON' 
                          ? [
                              { value: 'proveedor', label: 'Proveedor' },
                              { value: 'producto', label: 'Producto' },
                              { value: 'cantidad', label: 'Cantidad' },
                              { value: 'unidad', label: 'Unidad' },
                              { value: 'precio_unitario', label: 'Precio Unitario' },
                              { value: 'importe_total', label: 'Importe Total' },
                              { value: 'tipo_envio', label: 'Tipo de Envío' },
                              { value: 'costo_envio_total', label: 'Costo de Envío' },
                              { value: 'importe_venta', label: 'Precio Final' }
                            ]
                          : [
                              { value: 'producto', label: 'Producto' },
                              { value: 'cantidad', label: 'Cantidad' },
                              { value: 'unidad', label: 'Unidad' },
                              { value: 'precio_unitario', label: 'Precio Unitario' },
                              { value: 'importe_total', label: 'Importe Total' },
                              { value: 'tipo_envio', label: 'Tipo de Envío' },
                              { value: 'costo_envio_total', label: 'Costo de Envío' },
                              { value: 'importe_venta', label: 'Precio Final' }
                            ]
                        ).map((column) => (
                          <label key={column.value} className="flex items-center space-x-2 text-sm">
                            <input
                              type="checkbox"
                              checked={selectedColumns.includes(column.value)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedColumns([...selectedColumns, column.value]);
                                } else {
                                  setSelectedColumns(selectedColumns.filter(c => c !== column.value));
                                }
                              }}
                              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <span className="text-gray-700">{column.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Internal/Sales Intelligence Columns */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Inteligencia de Ventas (Interno)
                      </h4>
                      <div className="space-y-2">
                        {[
                          { value: 'costo_total_u', label: 'Costo Total Unitario' },
                          { value: 'costo_total', label: 'Costo Total' },
                          { value: 'ganancia_porcentaje', label: 'Margen de Ganancia %' },
                          { value: 'ganancia_u', label: 'Ganancia Unitaria' },
                          { value: 'ganancia_t', label: 'Ganancia Total' },
                          { value: 'importe_venta_u', label: 'Precio Venta Unitario' }
                        ].map((column) => (
                          <label key={column.value} className="flex items-center space-x-2 text-sm">
                            <input
                              type="checkbox"
                              checked={selectedColumns.includes(column.value)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedColumns([...selectedColumns, column.value]);
                                } else {
                                  setSelectedColumns(selectedColumns.filter(c => c !== column.value));
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-gray-700">{column.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick Selection Buttons */}
                  <div className="flex justify-center space-x-4 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const customerColumns = currentBalance?.balance_type === 'COMPARISON' 
                          ? ['proveedor', 'producto', 'cantidad', 'unidad', 'precio_unitario', 'importe_total', 'tipo_envio', 'costo_envio_total', 'importe_venta']
                          : ['producto', 'cantidad', 'unidad', 'precio_unitario', 'importe_total', 'tipo_envio', 'costo_envio_total', 'importe_venta'];
                        setSelectedColumns(customerColumns);
                      }}
                      className="border-green-300 text-green-700 hover:bg-green-50"
                    >
                      Solo Cliente
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedColumns(['costo_total_u', 'costo_total', 'ganancia_porcentaje', 'ganancia_u', 'ganancia_t', 'importe_venta_u']);
                      }}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      Solo Interno
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const allColumns = currentBalance?.balance_type === 'COMPARISON' 
                          ? ['proveedor', 'producto', 'cantidad', 'unidad', 'precio_unitario', 'importe_total', 'tipo_envio', 'costo_envio_total', 'importe_venta', 'costo_total_u', 'costo_total', 'ganancia_porcentaje', 'ganancia_u', 'ganancia_t', 'importe_venta_u']
                          : ['producto', 'cantidad', 'unidad', 'precio_unitario', 'importe_total', 'tipo_envio', 'costo_envio_total', 'importe_venta', 'costo_total_u', 'costo_total', 'ganancia_porcentaje', 'ganancia_u', 'ganancia_t', 'importe_venta_u'];
                        setSelectedColumns(allColumns);
                      }}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Seleccionar Todo
                    </Button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowExportModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => {
                      switch (selectedExportType) {
                        case 'csv':
                          exportToCSV();
                          break;
                        case 'excel':
                          exportToExcel();
                          break;
                        case 'pdf':
                          exportToPDF();
                          break;
                        case 'image':
                          exportToImage();
                          break;
                        case 'word':
                          exportToWord();
                          break;
                      }
                      setShowExportModal(false);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={saving}
                  >
                    {saving ? 'Exportando...' : 'Exportar'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductBalancePage;
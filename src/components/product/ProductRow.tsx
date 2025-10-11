import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/utils/dateUtils';
import { apiRequest } from '@/utils/api';

export interface ProductRowProps {
  id: string | number;
  name: string;
  price?: number;
  stock?: number;
  unit?: string;
  category: string;
  suppliers: string[];
  status: 'active' | 'inactive';
  description?: string;
  supplierNames?: string[];
  lastUpdated?: string;
  createdAt?: string;
  categoryId?: number;
  categoryOptions?: { value: string; label: string }[];
  currency?: string;
  onUpdate?: (updatedData: any) => void;
  // Add more fields as needed
}

const ProductRow: React.FC<ProductRowProps> = ({ 
  id, 
  name, 
  price, 
  stock, 
  unit, 
  category, 
  suppliers, 
  status, 
  description, 
  lastUpdated, 
  createdAt, 
  categoryId,
  categoryOptions = [],
  currency,
  onUpdate
}) => {
  const navigate = useNavigate();
  const formattedDate = formatDate(lastUpdated || createdAt);
  
  // State for inline editing
  const [editingStock, setEditingStock] = useState(false);
  const [editingCategory, setEditingCategory] = useState(false);
  const [tempStock, setTempStock] = useState(stock?.toString() || '0');
  const [tempCategoryId, setTempCategoryId] = useState(categoryId?.toString() || '');
  const [saving, setSaving] = useState(false);
  
  // Handle stock update
  const handleStockUpdate = async () => {
    if (saving) return;
    
    const newStock = parseInt(tempStock) || 0;
    if (newStock === stock) {
      setEditingStock(false);
      return;
    }
    
    try {
      setSaving(true);
      
      const response = await apiRequest(`/products/${id}/stock?stock=${newStock}`, {
        method: 'PATCH'
      });
      
      setEditingStock(false);
      
      if (response.success && onUpdate) {
        // Update only this product's data locally
        onUpdate({
          id,
          stock: newStock,
          lastUpdated: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      setTempStock(stock?.toString() || '0');
    } finally {
      setSaving(false);
    }
  };

  // Handle category update
  const handleCategoryUpdate = async (newCategoryId: string) => {
    if (saving) return;
    
    const categoryIdNum = parseInt(newCategoryId) || null;
    if (categoryIdNum === categoryId) {
      return;
    }
    
    try {
      setSaving(true);
      
      const response = await apiRequest(`/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category_id: categoryIdNum
        })
      });
      
      if (response.success && onUpdate) {
        const newCategoryName = categoryOptions.find(opt => opt.value === newCategoryId)?.label || 'Unknown';
        // Update only this product's data locally
        onUpdate({
          id,
          categoryId: categoryIdNum,
          category: newCategoryName,
          lastUpdated: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error updating category:', error);
      setTempCategoryId(categoryId?.toString() || '');
    } finally {
      setSaving(false);
    }
  };

  const handleRowClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on inputs, selects, or if we're editing
    if ((e.target as HTMLElement).closest('input, select') || editingStock || editingCategory) {
      return;
    }
    navigate(`/product-admin/${id}`);
  };
  
  return (
    <tr 
      className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-green-50/50 hover:to-emerald-50/50 transition-all duration-200 cursor-pointer"
      onClick={handleRowClick}
    >
      {/* Name */}
      <td className="px-2 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-4">
        <div className="font-medium text-gray-900 text-sm sm:text-base break-words">{name}</div>
        {/* Show additional info on mobile */}
        <div className="text-xs text-gray-500 mt-1 space-y-0.5">
          {suppliers.length > 0 && (
            <div>
              Proveedores: {suppliers.slice(0, 1).join(', ')}
              {suppliers.length > 1 && ` +${suppliers.length - 1} más`}
            </div>
          )}
          {/* Show category, unit, and stock on mobile (when those columns are hidden) */}
          <div className="md:hidden">
            Stock: <span className={`font-medium ${
              (stock || 0) > 0 ? 'text-green-600' : 'text-red-600'
            }`}>{stock?.toLocaleString() || '0'}</span>
            <span className="ml-2">• Categoría: <span className="font-medium">{category}</span></span>
            {unit && <span className="ml-2">• Unidad: {unit}</span>}
          </div>

          {/* Show last updated on mobile (when date column is hidden) */}
          <div className="lg:hidden">
            Actualizado: {formattedDate}
          </div>
        </div>
      </td>
      
      {/* Price - Always visible */}
      <td className="px-2 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-4">
        <div className="text-sm sm:text-base font-semibold text-gray-900">
          {price != null ? `$${Number(price).toLocaleString()}` : 'N/A'}
        </div>
        {/* Currency indicator - products can have multiple currencies from different suppliers */}
        {currency && (
          <div className="text-xs text-gray-500 mt-1">
            {currency}
          </div>
        )}
      </td>

      {/* Stock - Always visible with inline editing */}
      <td className="px-2 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-4">
        {editingStock ? (
          <Input
            type="number"
            value={tempStock}
            onChange={(e) => setTempStock(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleStockUpdate();
              }
              if (e.key === 'Escape') {
                setEditingStock(false);
                setTempStock(stock?.toString() || '0');
              }
            }}
            onBlur={handleStockUpdate}
            className="w-20 h-8 text-sm"
            min="0"
            disabled={saving}
            autoFocus
          />
        ) : (
          <div 
            className="flex items-center cursor-pointer hover:bg-gray-100 rounded px-2 py-1"
            onClick={(e) => {
              e.stopPropagation();
              setEditingStock(true);
            }}
          >
            <span className={`text-sm font-medium ${
              (stock || 0) > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {stock?.toLocaleString() || '0'}
            </span>
            <svg className="w-3 h-3 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
        )}
      </td>
      
      {/* Unit - Hidden on mobile */}
      <td className="hidden md:table-cell px-2 py-2 md:px-4 md:py-3 lg:px-6 lg:py-4">
        <div className="text-xs sm:text-sm text-gray-600">
          {unit || 'N/A'}
        </div>
      </td>
      
      {/* Category - Hidden on mobile with inline editing */}
      <td className="hidden md:table-cell px-2 py-2 md:px-4 md:py-3 lg:px-6 lg:py-4">
        {editingCategory ? (
          <select
            value={tempCategoryId}
            onChange={(e) => {
              const newValue = e.target.value;
              setTempCategoryId(newValue);
              handleCategoryUpdate(newValue);
              setEditingCategory(false);
            }}
            onBlur={() => setEditingCategory(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setEditingCategory(false);
                setTempCategoryId(categoryId?.toString() || '');
              }
            }}
            className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500 min-w-[120px]"
            disabled={saving}
            autoFocus
          >
            <option value="">Sin categoría</option>
            {categoryOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <span 
            className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 break-words cursor-pointer hover:bg-green-200"
            onClick={(e) => {
              e.stopPropagation();
              setEditingCategory(true);
            }}
          >
            {category}
            <svg className="w-3 h-3 ml-1 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </span>
        )}
      </td>
      
      {/* Last Updated - Hidden on smaller screens */}
      <td className="hidden lg:table-cell px-2 py-2 lg:px-6 lg:py-4">
        <div className="text-xs sm:text-sm text-gray-600">{formattedDate}</div>
      </td>
      
      {/* Description - Hidden on smaller screens */}
      <td className="hidden lg:table-cell px-2 py-2 lg:px-6 lg:py-4">
        {description ? (
          <div className="text-xs sm:text-sm text-gray-600 max-w-xs truncate" title={description}>
            {description}
          </div>
        ) : (
          <div className="text-xs sm:text-sm text-gray-400">Sin descripción</div>
        )}
      </td>
    </tr>
  );
};

export default ProductRow; 
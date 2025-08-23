import React from 'react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { formatDate } from '@/utils/dateUtils';

export interface ProductRowProps {
  id: string | number;
  name: string;
  price?: number;
  unit?: string;
  category: string;
  suppliers: string[];
  status: 'active' | 'inactive';
  description?: string;
  supplierNames?: string[];
  lastUpdated?: string;
  createdAt?: string;
  // Add more fields as needed
}

const ProductRow: React.FC<ProductRowProps> = ({ id, name, price, unit, category, suppliers, status, description, lastUpdated, createdAt }) => {
  const navigate = useNavigate();
  const formattedDate = formatDate(lastUpdated || createdAt);
  
  const handleRowClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on buttons or links
    if ((e.target as HTMLElement).closest('button, a')) {
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
          {/* Show category and unit on mobile (when those columns are hidden) */}
          <div className="md:hidden">
            Categoría: <span className="font-medium">{category}</span>
            {unit && <span className="ml-2">• Unidad: {unit}</span>}
          </div>
          {/* Show created date on mobile (when created column is hidden) */}
          <div className="lg:hidden">
            Creado: {formatDate(createdAt)}
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
      </td>
      
      {/* Unit - Hidden on mobile */}
      <td className="hidden md:table-cell px-2 py-2 md:px-4 md:py-3 lg:px-6 lg:py-4">
        <div className="text-xs sm:text-sm text-gray-600">
          {unit || 'N/A'}
        </div>
      </td>
      
      {/* Category - Hidden on mobile */}
      <td className="hidden md:table-cell px-2 py-2 md:px-4 md:py-3 lg:px-6 lg:py-4">
        <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 break-words">
          {category}
        </span>
      </td>
      
      {/* Created Date - Hidden on smaller screens */}
      <td className="hidden lg:table-cell px-2 py-2 lg:px-6 lg:py-4">
        <div className="text-xs sm:text-sm text-gray-600">
          {formatDate(createdAt)}
        </div>
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
      
      {/* Actions */}
      <td className="px-2 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-4">
        <div className="flex gap-x-1 sm:gap-x-2">
          <Link to={`/product-admin/${id}`}>
            <Button 
              size="sm" 
              variant="outline" 
              className="border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
            >
              Ver
            </Button>
          </Link>
        </div>
      </td>
    </tr>
  );
};

export default ProductRow; 
import React from 'react';
import { Card } from '@/components/ui/card';

interface ProductTableSkeletonProps {
  rows?: number;
}

const ProductTableSkeleton: React.FC<ProductTableSkeletonProps> = ({ rows = 8 }) => {
  return (
    <Card className="w-full overflow-x-auto shadow-lg border-0 rounded-xl">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-gradient-to-r from-gray-50 to-green-50 border-b border-green-100">
            <th className="px-2 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700">Nombre</th>
            <th className="px-2 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700">Categoría</th>
            <th className="hidden lg:table-cell px-2 py-2 lg:px-6 lg:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700">Última Actualización</th>
            <th className="hidden lg:table-cell px-2 py-2 lg:px-6 lg:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700">Descripción</th>
            <th className="hidden md:table-cell px-2 py-2 md:px-4 md:py-3 lg:px-6 lg:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700">SKU</th>
            <th className="px-2 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, index) => (
            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50/50">
              {/* Name column */}
              <td className="px-2 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-4">
                <div className="h-4 sm:h-5 bg-gray-200 rounded animate-pulse w-3/4 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
              </td>
              {/* Category column */}
              <td className="px-2 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-4">
                <div className="h-5 sm:h-6 bg-gray-200 rounded-full animate-pulse w-16 sm:w-20"></div>
              </td>
              {/* Last Updated - Hidden on smaller screens */}
              <td className="hidden lg:table-cell px-2 py-2 lg:px-6 lg:py-4">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
              </td>
              {/* Description - Hidden on smaller screens */}
              <td className="hidden lg:table-cell px-2 py-2 lg:px-6 lg:py-4">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
              </td>
              {/* SKU - Hidden on mobile */}
              <td className="hidden md:table-cell px-2 py-2 md:px-4 md:py-3 lg:px-6 lg:py-4">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
              </td>
              {/* Actions */}
              <td className="px-2 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-4">
                <div className="flex gap-1 sm:gap-2">
                  <div className="h-7 sm:h-8 w-12 sm:w-16 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
};

export default ProductTableSkeleton; 
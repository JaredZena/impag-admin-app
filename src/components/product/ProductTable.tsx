import React from 'react';
import ProductRow, { ProductRowProps } from './ProductRow';
import ProductTableSkeleton from './ProductTableSkeleton';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface ProductTableProps {
  products: (ProductRowProps & { description?: string; supplierNames?: string[]; lastUpdated?: string; createdAt?: string; })[];
  loading?: boolean;
  hasFilters?: boolean;
  onAddProduct?: () => void;
  // For future: pagination, sorting, loading, etc.
}

const ProductTable: React.FC<ProductTableProps> = ({ products, loading = false, hasFilters = false, onAddProduct }) => {
  // Show skeleton loader when loading and no products yet
  if (loading && products.length === 0) {
    return <ProductTableSkeleton />;
  }

  return (
    <Card className="w-full overflow-x-auto shadow-lg border-0 rounded-xl">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-gradient-to-r from-gray-50 to-green-50 border-b border-green-100">
            <th className="px-2 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700">Nombre</th>
            <th className="px-2 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700">Precio</th>
            <th className="hidden md:table-cell px-2 py-2 md:px-4 md:py-3 lg:px-6 lg:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700">Unidad</th>
            <th className="hidden md:table-cell px-2 py-2 md:px-4 md:py-3 lg:px-6 lg:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700">Categoría</th>
            <th className="hidden lg:table-cell px-2 py-2 lg:px-6 lg:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700">Creado</th>
            <th className="hidden lg:table-cell px-2 py-2 lg:px-6 lg:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700">Última Actualización</th>
            <th className="hidden lg:table-cell px-2 py-2 lg:px-6 lg:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700">Descripción</th>
            <th className="px-2 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 && !loading ? (
            <tr>
              <td colSpan={8} className="text-center py-8 sm:py-12 text-gray-500">
                <div className="flex flex-col items-center justify-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 mb-3 sm:mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-4V8a1 1 0 00-1-1H7a1 1 0 00-1 1v1m0 4h.01" />
                    </svg>
                  </div>
                  <p className="text-base sm:text-lg font-medium mb-1 sm:mb-2">No se encontraron productos</p>
                  <p className="text-xs sm:text-sm text-gray-400">
                    {hasFilters ? 'Intenta ajustar tus filtros de búsqueda' : 'No hay productos registrados'}
                  </p>
                  {!hasFilters && onAddProduct && (
                    <Button 
                      onClick={onAddProduct}
                      className="mt-4 bg-green-600 hover:bg-green-700 text-white"
                    >
                      Agregar Primer Producto
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            products.map(product => (
              <ProductRow key={product.id} {...product} />
            ))
          )}
        </tbody>
      </table>
    </Card>
  );
};

export default ProductTable; 
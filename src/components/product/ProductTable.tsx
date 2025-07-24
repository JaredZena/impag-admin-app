import React from 'react';
import ProductRow, { ProductRowProps } from './ProductRow';
import { Card } from '@/components/ui/card';

export interface ProductTableProps {
  products: (ProductRowProps & { description?: string; supplierNames?: string[]; lastUpdated?: string; createdAt?: string; })[];
  // For future: pagination, sorting, loading, etc.
}

const ProductTable: React.FC<ProductTableProps> = ({ products }) => {
  return (
    <Card className="w-full overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-left text-xs font-semibold text-gray-700">ID</th>
            <th className="px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-left text-xs font-semibold text-gray-700">Name</th>
            <th className="px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-left text-xs font-semibold text-gray-700">SKU</th>
            <th className="px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-left text-xs font-semibold text-gray-700">Category</th>
            <th className="hidden xl:table-cell px-2 py-1 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-left text-xs font-semibold text-gray-700">Last Updated</th>
            <th className="hidden xl:table-cell px-2 py-1 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-left text-xs font-semibold text-gray-700">Description</th>
            <th className="px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-left text-xs font-semibold text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center py-8 text-gray-400">No products found.</td>
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
import React from 'react';
import { Card } from '@/components/ui/card';

export interface Variant {
  id: string | number;
  sku: string;
  price: number;
  stock: number;
  is_active: boolean;
  suppliers: string[];
}

export interface VariantsTableProps {
  variants: Variant[];
}

const VariantsTable: React.FC<VariantsTableProps> = ({ variants }) => {
  return (
    <Card className="w-full overflow-x-auto mt-8">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-left text-xs font-semibold text-gray-700">SKU</th>
            <th className="px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-left text-xs font-semibold text-gray-700">Price</th>
            <th className="px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-left text-xs font-semibold text-gray-700">Stock</th>
            <th className="px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-left text-xs font-semibold text-gray-700">Status</th>
            <th className="hidden lg:table-cell px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-left text-xs font-semibold text-gray-700">Suppliers</th>
            <th className="px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-left text-xs font-semibold text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {variants.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-8 text-gray-400">No variants found.</td>
            </tr>
          ) : (
            variants.map(variant => (
              <tr key={variant.id} className="border-b hover:bg-gray-50">
                <td className="px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-sm">{variant.sku}</td>
                <td className="px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-sm">{variant.price}</td>
                <td className="px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-sm">{variant.stock}</td>
                <td className="px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-sm">
                  <span className={variant.is_active ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                    {variant.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="hidden lg:table-cell px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-sm">{variant.suppliers.join(', ')}</td>
                <td className="px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-sm">
                  {/* Add actions like View/Edit if needed */}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </Card>
  );
};

export default VariantsTable; 
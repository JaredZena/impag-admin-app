import React from 'react';
import { Card } from '@/components/ui/card';

export interface Supplier {
  id: string | number;
  name: string;
  price: number;
  stock: number;
  lead_time_days: number;
  is_active: boolean;
}

export interface SuppliersTableProps {
  suppliers: Supplier[];
}

const SuppliersTable: React.FC<SuppliersTableProps> = ({ suppliers }) => {
  return (
    <Card className="w-full overflow-x-auto mt-8">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-left text-xs font-semibold text-gray-700">Name</th>
            <th className="px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-left text-xs font-semibold text-gray-700">Price</th>
            <th className="px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-left text-xs font-semibold text-gray-700">Stock</th>
            <th className="px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-left text-xs font-semibold text-gray-700">Lead Time (days)</th>
            <th className="hidden lg:table-cell px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-left text-xs font-semibold text-gray-700">Status</th>
            <th className="px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-left text-xs font-semibold text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {suppliers.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-8 text-gray-400">No suppliers found.</td>
            </tr>
          ) : (
            suppliers.map(supplier => (
              <tr key={supplier.id} className="border-b hover:bg-gray-50">
                <td className="px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-sm">{supplier.name}</td>
                <td className="px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-sm">{supplier.price}</td>
                <td className="px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-sm">{supplier.stock}</td>
                <td className="px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-sm">{supplier.lead_time_days}</td>
                <td className="hidden lg:table-cell px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-sm">
                  <span className={supplier.is_active ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                    {supplier.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
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

export default SuppliersTable; 
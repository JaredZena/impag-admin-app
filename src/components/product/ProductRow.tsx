import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export interface ProductRowProps {
  id: string | number;
  name: string;
  sku: string;
  category: string;
  suppliers: string[];
  status: 'active' | 'inactive';
  description?: string;
  supplierNames?: string[];
  lastUpdated?: string;
  createdAt?: string;
  // Add more fields as needed
}

const ProductRow: React.FC<ProductRowProps> = ({ id, name, sku, category, suppliers, status, description, lastUpdated, createdAt }) => {
  // Format date as YYYY-MM-DD
  const dateToShow = lastUpdated || createdAt || '';
  const formattedDate = dateToShow ? new Date(dateToShow).toISOString().slice(0, 10) : '-';
  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-sm">{id}</td>
      <td className="px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-sm">{name}</td>
      <td className="px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-sm">{sku}</td>
      <td className="px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-sm">{category}</td>
      {/* XL: Last updated date */}
      <td className="hidden xl:table-cell px-2 py-1 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-sm align-top">
        <div className="text-xs text-muted-foreground mt-1">{formattedDate}</div>
      </td>
      {/* XL: Description */}
      <td className="hidden xl:table-cell px-2 py-1 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-sm align-top">
        {description ? (
          <div className="text-xs text-muted-foreground mt-1 whitespace-pre-line break-words max-w-xs">{description}</div>
        ) : (
          <div className="text-xs text-muted-foreground mt-1">-</div>
        )}
      </td>
      <td className="px-2 py-1 sm:px-4 sm:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 3xl:px-12 3xl:py-6 text-sm">
        <div className="flex gap-x-2">
          <Link to={`/product-admin/${id}`}><Button size="sm" variant="outline">View</Button></Link>
          <Button size="sm" variant="default">Edit</Button>
        </div>
      </td>
    </tr>
  );
};

export default ProductRow; 
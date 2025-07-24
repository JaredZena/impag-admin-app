import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
// If you have a Select component in shadcn/ui, import it. Otherwise, use a native select for now.

interface ProductSearchBarProps {
  id: string;
  name: string;
  sku: string;
  category: string;
  supplier: string;
  onIdChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSkuChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSupplierChange: (value: string) => void;
  categoryOptions?: { value: string; label: string }[];
  supplierOptions?: { value: string; label: string }[];
}

const ProductSearchBar: React.FC<ProductSearchBarProps> = ({
  id,
  name,
  sku,
  category,
  supplier,
  onIdChange,
  onNameChange,
  onSkuChange,
  onCategoryChange,
  onSupplierChange,
  categoryOptions = [],
  supplierOptions = [],
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-9 3xl:grid-cols-12 gap-4 mb-6">
      <Input
        placeholder="Product ID"
        value={id}
        onChange={e => onIdChange(e.target.value)}
        className="lg:col-span-1 xl:col-span-1 2xl:col-span-1 3xl:col-span-1"
      />
      <Input
        placeholder="Product Name"
        value={name}
        onChange={e => onNameChange(e.target.value)}
        className="lg:col-span-2 xl:col-span-2 2xl:col-span-3 3xl:col-span-4"
      />
      <Input
        placeholder="SKU"
        value={sku}
        onChange={e => onSkuChange(e.target.value)}
        className="lg:col-span-1 xl:col-span-1 2xl:col-span-1 3xl:col-span-1"
      />
      <select
        value={category}
        onChange={e => onCategoryChange(e.target.value)}
        className="lg:col-span-1 xl:col-span-1 2xl:col-span-2 3xl:col-span-2 border rounded px-2 py-1 text-sm"
      >
        <option value="">All Categories</option>
        {categoryOptions.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <select
        value={supplier}
        onChange={e => onSupplierChange(e.target.value)}
        className="lg:col-span-1 xl:col-span-2 2xl:col-span-2 3xl:col-span-2 border rounded px-2 py-1 text-sm"
      >
        <option value="">All Suppliers</option>
        {supplierOptions.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {/* You can add a search button or filter chips here if needed */}
    </div>
  );
};

export default ProductSearchBar; 
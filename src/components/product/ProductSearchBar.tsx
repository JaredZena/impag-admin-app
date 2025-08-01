import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
// If you have a Select component in shadcn/ui, import it. Otherwise, use a native select for now.

interface ProductSearchBarProps {
  name: string;
  category: string;
  supplier: string;
  onNameChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSupplierChange: (value: string) => void;
  categoryOptions?: { value: string; label: string }[];
  supplierOptions?: { value: string; label: string }[];
}

const ProductSearchBar: React.FC<ProductSearchBarProps> = ({
  name,
  category,
  supplier,
  onNameChange,
  onCategoryChange,
  onSupplierChange,
  categoryOptions = [],
  supplierOptions = [],
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <Input
        placeholder="Product Name"
        value={name}
        onChange={e => onNameChange(e.target.value)}
        className="lg:col-span-1"
      />
      <select
        value={category}
        onChange={e => onCategoryChange(e.target.value)}
        className="lg:col-span-1 border rounded px-2 py-1 text-sm"
      >
        <option value="">All Categories</option>
        {categoryOptions.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <select
        value={supplier}
        onChange={e => onSupplierChange(e.target.value)}
        className="lg:col-span-1 border rounded px-2 py-1 text-sm"
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
import React, { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface SupplierSearchBarProps {
  onSearch: (searchTerm: string) => void;
  placeholder?: string;
}

const SupplierSearchBar: React.FC<SupplierSearchBarProps> = ({ 
  onSearch, 
  placeholder = "Buscar proveedores por nombre, contacto o email..." 
}) => {
  const [searchValue, setSearchValue] = useState('');

  // Debounced search function
  const debouncedSearch = useCallback(() => {
    const timeoutId = setTimeout(() => {
      onSearch(searchValue);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchValue, onSearch]);

  useEffect(() => {
    const cleanup = debouncedSearch();
    return cleanup;
  }, [debouncedSearch]);

  const handleClearSearch = () => {
    setSearchValue('');
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg 
            className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
            />
          </svg>
        </div>
        
        <Input
          type="text"
          placeholder={placeholder}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-9 sm:pl-10 pr-10 py-2 sm:py-3 text-sm sm:text-base border-gray-300 focus:border-green-500 focus:ring-green-500 rounded-lg"
        />
        
        {searchValue && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 transition-colors"
          >
            <svg 
              className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          </button>
        )}
      </div>
      
      {searchValue && (
        <div className="mt-2 text-xs sm:text-sm text-gray-500">
          Buscando: "{searchValue}"
        </div>
      )}
    </div>
  );
};

export default SupplierSearchBar; 
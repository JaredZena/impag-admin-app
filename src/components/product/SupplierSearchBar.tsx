import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SupplierSearchBarProps {
  name: string;
  contact: string;
  email: string;
  onNameChange: (value: string) => void;
  onContactChange: (value: string) => void;
  onEmailChange: (value: string) => void;
}

const SupplierSearchBar: React.FC<SupplierSearchBarProps> = ({
  name,
  contact,
  email,
  onNameChange,
  onContactChange,
  onEmailChange,
}) => {
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
        <div className="flex items-center space-x-2 text-green-700">
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="font-semibold text-sm sm:text-base">Buscar y Filtrar Proveedores</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        <div className="space-y-1 sm:space-y-2">
          <label className="text-xs sm:text-sm font-medium text-gray-700">Nombre del Proveedor</label>
          <Input
            placeholder="Buscar por nombre..."
            value={name}
            onChange={e => onNameChange(e.target.value)}
            className="border-gray-300 focus:border-green-500 focus:ring-green-500 bg-white text-gray-900 text-sm sm:text-base px-2 sm:px-3 py-1 sm:py-2"
          />
        </div>

        <div className="space-y-1 sm:space-y-2">
          <label className="text-xs sm:text-sm font-medium text-gray-700">Contacto</label>
          <Input
            placeholder="Buscar por contacto..."
            value={contact}
            onChange={e => onContactChange(e.target.value)}
            className="border-gray-300 focus:border-green-500 focus:ring-green-500 bg-white text-gray-900 text-sm sm:text-base px-2 sm:px-3 py-1 sm:py-2"
          />
        </div>

        <div className="space-y-1 sm:space-y-2">
          <label className="text-xs sm:text-sm font-medium text-gray-700">Email</label>
          <Input
            placeholder="Buscar por email..."
            value={email}
            onChange={e => onEmailChange(e.target.value)}
            className="border-gray-300 focus:border-green-500 focus:ring-green-500 bg-white text-gray-900 text-sm sm:text-base px-2 sm:px-3 py-1 sm:py-2"
          />
        </div>
      </div>

      {(name || contact || email) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-3 sm:pt-4 border-t border-gray-200 gap-2 sm:gap-0">
          <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
            <span>Filtros activos aplicados</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onNameChange('');
              onContactChange('');
              onEmailChange('');
            }}
            className="text-gray-600 border-gray-300 hover:bg-gray-50 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 w-full sm:w-auto"
          >
            Limpiar Filtros
          </Button>
        </div>
      )}
    </div>
  );
};

export default SupplierSearchBar; 
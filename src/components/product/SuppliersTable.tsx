import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatReadableDate } from '@/utils/dateUtils';
import { formatCurrency } from '@/utils/currencyUtils';
import { useNavigate } from 'react-router-dom';

export interface Supplier {
  id: string | number;
  name: string;
  price: number;
  currency?: string; // Currency of the price (MXN or USD)
  shipping_cost?: number | null;
  contact_name: string | null;
  phone: string | null;
  website_url: string | null;
  address: string | null;
  last_updated: string | null;
  is_active: boolean;
  supplier_product_id?: string | number; // ID of the supplier-product relationship
}

export interface SuppliersTableProps {
  suppliers: Supplier[];
  onRemoveSupplier?: (supplierProductId: string | number) => void;
}

const SuppliersTable: React.FC<SuppliersTableProps> = ({ suppliers, onRemoveSupplier }) => {
  const navigate = useNavigate();

  const handleSupplierClick = (supplierId: string | number) => {
    navigate(`/supplier-admin/${supplierId}`);
  };

  return (
    <Card className="shadow-lg border-0 rounded-xl overflow-hidden">
      <div className="bg-gradient-to-r from-gray-50 to-green-50 border-b border-green-100 p-3 sm:p-4 md:p-6">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-sm sm:text-lg">Proveedores</span>
          <span className="ml-2 text-xs sm:text-sm font-normal text-gray-500">({suppliers.length})</span>
        </h3>
      </div>
      
      <div className="p-3 sm:p-4">
        {suppliers.length === 0 ? (
          <div className="text-center py-6 sm:py-8 text-gray-500">
            <div className="flex flex-col items-center justify-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 mb-3 sm:mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="font-medium text-sm sm:text-base">No se encontraron proveedores</p>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">No hay proveedores vinculados a este producto</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {suppliers.map((supplier, index) => (
              <div 
                key={supplier.id}
                className={`p-3 sm:p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-gradient-to-r hover:from-green-50/30 hover:to-emerald-50/30 transition-all duration-200 ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 sm:mb-3 gap-2 sm:gap-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <h4 
                      className="font-semibold text-gray-900 hover:text-green-700 cursor-pointer transition-colors duration-200 text-sm sm:text-base break-words"
                      onClick={() => handleSupplierClick(supplier.id)}
                    >
                      {supplier.name || 'Proveedor Desconocido'}
                    </h4>
                    {/* Mobile: Show price next to name */}
                    <div className="sm:hidden">
                      <span className="font-semibold text-gray-900 text-sm">
                        {supplier.price != null ? formatCurrency(supplier.price, supplier.currency) : 'N/A'}
                        {supplier.currency && (
                          <span className="ml-1 text-xs text-gray-600 font-medium">
                            {supplier.currency}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium self-start sm:self-auto ${
                    supplier.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {supplier.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                
                {/* Mobile View - Last Update */}
                <div className="sm:hidden">
                  <div>
                    <span className="text-gray-500 block text-xs">Última actualización:</span>
                    <div className="text-gray-700 mt-1 text-xs">
                      {formatReadableDate(supplier.last_updated)}
                    </div>
                  </div>
                </div>

                {/* Desktop View - All Fields */}
                <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div>
                    <span className="text-gray-500 block sm:inline">Precio:</span>
                    <div className="font-semibold text-gray-900 mt-1 sm:mt-0 sm:ml-1 sm:inline">
                      {supplier.price != null ? formatCurrency(supplier.price, supplier.currency) : 'N/A'}
                      {supplier.currency && (
                        <span className="ml-1 text-xs text-gray-600 font-medium">
                          {supplier.currency}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 block sm:inline">Costo de Envío:</span>
                    <div className="font-medium text-gray-900 mt-1 sm:mt-0 sm:ml-1 sm:inline">
                      {supplier.shipping_cost != null ? formatCurrency(supplier.shipping_cost, supplier.currency) : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 block sm:inline">Persona de Contacto:</span>
                    <div className="font-medium text-gray-900 mt-1 sm:mt-0 sm:ml-1 sm:inline">
                      {supplier.contact_name || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 block sm:inline">Teléfono:</span>
                    <div className="font-medium text-gray-900 mt-1 sm:mt-0 sm:ml-1 sm:inline">
                      {supplier.phone || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 block sm:inline">Sitio Web:</span>
                    <div className="font-medium text-gray-900 mt-1 sm:mt-0 sm:ml-1 sm:inline break-all">
                      {supplier.website_url ? (
                        <a 
                          href={supplier.website_url.startsWith('http') ? supplier.website_url : `https://${supplier.website_url}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          {supplier.website_url}
                        </a>
                      ) : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 block sm:inline">Última Actualización:</span>
                    <div className="font-medium text-gray-700 mt-1 sm:mt-0 sm:ml-1 sm:inline">
                      {formatReadableDate(supplier.last_updated)}
                    </div>
                  </div>
                  <div className="hidden xl:block sm:col-span-2 lg:col-span-3 xl:col-span-6">
                    <span className="text-gray-500 block sm:inline">Dirección:</span>
                    <div className="font-medium text-gray-900 mt-1 sm:mt-0 sm:ml-1 sm:inline">
                      {supplier.address || 'N/A'}
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col sm:flex-row justify-start sm:justify-end gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleSupplierClick(supplier.id)}
                    className="w-full sm:w-auto border-green-200 text-green-700 hover:bg-green-50 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                  >
                    Ver Detalles
                  </Button>
                  {onRemoveSupplier && supplier.supplier_product_id && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onRemoveSupplier(supplier.supplier_product_id!)}
                      className="w-full sm:w-auto border-red-200 text-red-700 hover:bg-red-50 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Remover
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default SuppliersTable; 
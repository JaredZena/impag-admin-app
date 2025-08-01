import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();

  const handleSupplierClick = (supplierId: string | number) => {
    navigate(`/supplier-admin/${supplierId}`);
  };

  return (
    <Card className="shadow-lg border-0 rounded-xl overflow-hidden">
      <div className="bg-gradient-to-r from-gray-50 to-green-50 border-b border-green-100 p-3 sm:p-4 md:p-6">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0h3m-3 0h5m0 0v-4a3 3 0 616 0v4m-3 0h.01M9 7h6m-6 4h6m-6 4h6" />
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0h3m-3 0h5m0 0v-4a3 3 0 616 0v4m-3 0h.01M9 7h6m-6 4h6m-6 4h6" />
                </svg>
              </div>
              <p className="font-medium text-sm sm:text-base">No se encontraron proveedores</p>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">No hay proveedores vinculados a esta variante</p>
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
                  <h4 
                    className="font-semibold text-gray-900 hover:text-green-700 cursor-pointer transition-colors duration-200 text-sm sm:text-base break-words"
                    onClick={() => handleSupplierClick(supplier.id)}
                  >
                    {supplier.name || 'Proveedor Desconocido'}
                  </h4>
                  <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium self-start sm:self-auto ${
                    supplier.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {supplier.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div>
                    <span className="text-gray-500 block sm:inline">Precio:</span>
                    <div className="font-semibold text-gray-900 mt-1 sm:mt-0 sm:ml-1 sm:inline">
                      {supplier.price != null ? `$${Number(supplier.price).toLocaleString()}` : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 block sm:inline">Stock:</span>
                    <div className={`font-medium mt-1 sm:mt-0 sm:ml-1 sm:inline ${
                      (supplier.stock || 0) > 50 ? 'text-green-600' : 
                      (supplier.stock || 0) > 10 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {supplier.stock != null ? supplier.stock : 0} unidades
                    </div>
                  </div>
                  <div className="sm:col-span-1 lg:col-span-1">
                    <span className="text-gray-500 block sm:inline">Tiempo de Entrega:</span>
                    <div className="font-medium text-gray-900 mt-1 sm:mt-0 sm:ml-1 sm:inline">
                      {supplier.lead_time_days != null ? supplier.lead_time_days : 0} días
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleSupplierClick(supplier.id)}
                    className="w-full border-green-200 text-green-700 hover:bg-green-50 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                  >
                    Ver Detalles
                  </Button>
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
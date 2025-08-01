import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
    <Card className="shadow-lg border-0 rounded-xl overflow-hidden">
      <div className="bg-gradient-to-r from-gray-50 to-green-50 border-b border-green-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Variantes del Producto
          <span className="ml-2 text-sm font-normal text-gray-500">({variants.length})</span>
        </h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">SKU</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Precio</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Stock</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Estado</th>
              <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Proveedores</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {variants.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-12 h-12 mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-4V8a1 1 0 00-1-1H7a1 1 0 00-1 1v1m0 4h.01" />
                      </svg>
                    </div>
                    <p className="font-medium">No se encontraron variantes</p>
                    <p className="text-sm text-gray-400 mt-1">Este producto aún no tiene variantes</p>
                  </div>
                </td>
              </tr>
            ) : (
              variants.map((variant, index) => (
                <tr 
                  key={variant.id} 
                  className={`border-b border-gray-100 hover:bg-gradient-to-r hover:from-green-50/30 hover:to-emerald-50/30 transition-all duration-200 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                  }`}
                >
                  <td className="px-4 py-4">
                    <span className="font-mono text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">
                      {variant.sku || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-semibold text-gray-900">
                      {variant.price != null ? `$${Number(variant.price).toLocaleString()}` : 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      <span className={`text-sm font-medium ${
                        (variant.stock || 0) > 50 ? 'text-green-600' : 
                        (variant.stock || 0) > 10 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {variant.stock != null ? variant.stock : 0}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">unidades</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      variant.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {variant.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="hidden lg:table-cell px-4 py-4">
                    <div className="text-sm text-gray-600">
                      {variant.suppliers && variant.suppliers.length > 0 ? (
                        <div className="space-y-1">
                          {variant.suppliers.slice(0, 2).map((supplier, idx) => (
                            <div key={idx} className="bg-blue-50 text-blue-800 px-2 py-1 rounded text-xs inline-block mr-1">
                              {supplier}
                            </div>
                          ))}
                          {variant.suppliers.length > 2 && (
                            <span className="text-xs text-gray-500">+{variant.suppliers.length - 2} más</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Sin proveedores</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-green-200 text-green-700 hover:bg-green-50 text-xs"
                      >
                        Editar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default VariantsTable; 
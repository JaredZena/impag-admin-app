import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiRequest } from '@/utils/api';
import SupplierSearchBar from './SupplierSearchBar';

interface Supplier {
  id: number;
  name: string;
  common_name?: string;
  legal_name?: string;
  rfc: string;
  description?: string;
  contact_name?: string;
  contact_common_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  website_url?: string;
  created_at: string;
  last_updated: string;
}

const SupplierManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ name: '', contact: '', email: '' });

  const fetchSuppliers = useCallback(async (searchFilters: { name: string; contact: string; email: string }, isInitialLoad = false) => {
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setSearchLoading(true);
    }
    setError(null);
    try {
      // Build search query from all filter fields
      const searchTerms = [searchFilters.name, searchFilters.contact, searchFilters.email]
        .filter(term => term.trim())
        .join(' ');
      
      const queryParams = searchTerms ? `?search=${encodeURIComponent(searchTerms)}` : '';
      const response = await apiRequest(`/suppliers${queryParams}`);
      setSuppliers(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar proveedores');
      console.error('Error fetching suppliers:', err);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setSearchLoading(false);
      }
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchSuppliers({ name: '', contact: '', email: '' }, true);
  }, [fetchSuppliers]);

  // Search when filters change
  useEffect(() => {
    // Skip initial empty state
    if (loading) return;
    
    // Debounce the search to avoid too many API calls
    const timeoutId = setTimeout(() => {
      fetchSuppliers(filters, false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filters, fetchSuppliers, loading]);

  const handleSupplierClick = (supplierId: number) => {
    navigate(`/supplier-admin/${supplierId}`);
  };

  const handleEditSupplier = (supplierId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    navigate(`/supplier-admin/edit/${supplierId}`);
  };

  const handleAddSupplier = () => {
    navigate('/supplier-admin/new');
  };

  // Handlers for search/filter changes
  const handleNameChange = (value: string) => setFilters(f => ({ ...f, name: value }));
  const handleContactChange = (value: string) => setFilters(f => ({ ...f, contact: value }));
  const handleEmailChange = (value: string) => setFilters(f => ({ ...f, email: value }));

  if (loading) {
    return (
      <div className="w-screen min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 overflow-x-hidden">
        <div className="container mx-auto max-w-7xl 2xl:max-w-screen-2xl px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 py-4 sm:py-6 lg:py-8">
          {/* Loading skeleton */}
          <div className="mb-6 sm:mb-8">
            <div className="h-8 sm:h-10 w-48 bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="h-12 w-full bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
          
          <Card className="p-4 sm:p-6 md:p-8">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2 p-4 border rounded">
                  <div className="h-5 w-48 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-screen min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 overflow-x-hidden">
        <div className="container mx-auto max-w-7xl 2xl:max-w-screen-2xl px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 py-4 sm:py-6 lg:py-8">
          <Card className="p-6 sm:p-8 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Error al Cargar Proveedores</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4">{error}</p>
            <Button onClick={() => fetchSuppliers(filters, false)} className="bg-green-600 hover:bg-green-700 text-sm sm:text-base">
              Intentar de Nuevo
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 overflow-x-hidden">
      <div className="container mx-auto max-w-7xl 2xl:max-w-screen-2xl px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent mb-2">
                Gestión de Proveedores
              </h1>
              <p className="text-sm sm:text-base text-gray-600">Administra tu directorio de proveedores y contactos</p>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={() => navigate('/product-admin')}
                variant="outline"
                className="border-green-200 text-green-700 hover:bg-green-50 whitespace-nowrap"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-4V8a1 1 0 00-1-1H7a1 1 0 00-1 1v1m0 4h.01" />
                </svg>
                Gestionar Productos
              </Button>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mb-6">
            <Button 
              onClick={() => navigate('/quotation-upload')}
              className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Subir Cotización
            </Button>
            <Button 
              onClick={handleAddSupplier}
              className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Agregar Nuevo Proveedor
            </Button>
          </div>
        </div>

        {/* Search and Filter Card */}
        <Card className="p-3 sm:p-4 md:p-6 mb-6 sm:mb-8 shadow-lg border-0 rounded-xl">
          <SupplierSearchBar
            name={filters.name}
            contact={filters.contact}
            email={filters.email}
            onNameChange={handleNameChange}
            onContactChange={handleContactChange}
            onEmailChange={handleEmailChange}
          />
        </Card>

        {/* Suppliers List */}
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
            {searchLoading ? (
              <div className="text-center py-8 sm:py-12">
                <div className="flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-4"></div>
                  <p className="text-sm text-gray-600">Buscando proveedores...</p>
                </div>
              </div>
            ) : suppliers.length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 mb-3 sm:mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <p className="font-medium text-sm sm:text-base">
                      {(filters.name || filters.contact || filters.email) ? 'No se encontraron proveedores' : 'No hay proveedores registrados'}
                    </p>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1">
                    {(filters.name || filters.contact || filters.email)
                      ? 'No hay proveedores que coincidan con los filtros aplicados' 
                      : 'Comienza agregando tu primer proveedor'
                    }
                  </p>
                  {!(filters.name || filters.contact || filters.email) && (
                    <Button 
                      onClick={handleAddSupplier}
                      className="mt-4 bg-green-600 hover:bg-green-700 text-white"
                    >
                      Agregar Primer Proveedor
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {suppliers.map((supplier, index) => (
                  <div 
                    key={supplier.id}
                    className={`p-3 sm:p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-gradient-to-r hover:from-green-50/30 hover:to-emerald-50/30 transition-all duration-200 cursor-pointer ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                    }`}
                    onClick={() => handleSupplierClick(supplier.id)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 sm:mb-3 gap-2 sm:gap-0">
                      <div>
                        <h4 className="font-semibold text-gray-900 hover:text-green-700 transition-colors duration-200 text-sm sm:text-base break-words">
                          {supplier.name || 'Proveedor Sin Nombre'}
                        </h4>
                        {supplier.common_name && supplier.common_name !== supplier.name && (
                          <p className="text-xs sm:text-sm text-gray-600 mt-1">
                            {supplier.common_name}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => handleEditSupplier(supplier.id, e)}
                          className="border-blue-200 text-blue-700 hover:bg-blue-50 text-xs px-2 py-1"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Editar
                        </Button>
                      </div>
                    </div>
                    
                    {/* Mobile View - Simplified Details */}
                    <div className="sm:hidden grid grid-cols-1 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500 block">Contacto:</span>
                        <div className="font-medium text-gray-900 mt-1">
                          {supplier.contact_name || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Teléfono:</span>
                        <div className="font-medium text-gray-900 mt-1">
                          {supplier.phone || 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Desktop View - Full Details */}
                    <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
                      <div>
                        <span className="text-gray-500 block sm:inline">RFC:</span>
                        <div className="font-medium text-gray-900 mt-1 sm:mt-0 sm:ml-1 sm:inline">
                          {supplier.rfc || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500 block sm:inline">Contacto:</span>
                        <div className="font-medium text-gray-900 mt-1 sm:mt-0 sm:ml-1 sm:inline">
                          {supplier.contact_name || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500 block sm:inline">Email:</span>
                        <div className="font-medium text-gray-900 mt-1 sm:mt-0 sm:ml-1 sm:inline break-all">
                          {supplier.email || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500 block sm:inline">Teléfono:</span>
                        <div className="font-medium text-gray-900 mt-1 sm:mt-0 sm:ml-1 sm:inline">
                          {supplier.phone || 'N/A'}
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-gray-500 block sm:inline">Dirección:</span>
                        <div className="font-medium text-gray-900 mt-1 sm:mt-0 sm:ml-1 sm:inline">
                          {supplier.address || 'N/A'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Description - Desktop Only */}
                    {supplier.description && (
                      <div className="hidden sm:block mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs sm:text-sm text-gray-600">
                          {supplier.description}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SupplierManagementPage; 
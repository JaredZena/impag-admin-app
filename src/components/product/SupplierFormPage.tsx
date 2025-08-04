import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/utils/api';

interface SupplierFormData {
  name: string;
  common_name: string;
  legal_name: string;
  rfc: string;
  description: string;
  contact_name: string;
  contact_common_name: string;
  email: string;
  phone: string;
  address: string;
  website_url: string;
}

const initialFormData: SupplierFormData = {
  name: '',
  common_name: '',
  legal_name: '',
  rfc: '',
  description: '',
  contact_name: '',
  contact_common_name: '',
  email: '',
  phone: '',
  address: '',
  website_url: '',
};

const SupplierFormPage: React.FC = () => {
  const { supplierId } = useParams<{ supplierId: string }>();
  const navigate = useNavigate();
  const isEditing = supplierId && supplierId !== 'new';
  
  const [formData, setFormData] = useState<SupplierFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [errors, setErrors] = useState<Partial<SupplierFormData>>({});

  useEffect(() => {
    if (isEditing) {
      fetchSupplier();
    }
  }, [supplierId, isEditing]);

  const fetchSupplier = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest(`/suppliers/${supplierId}`);
      if (response.data) {
        setFormData({
          name: response.data.name || '',
          common_name: response.data.common_name || '',
          legal_name: response.data.legal_name || '',
          rfc: response.data.rfc || '',
          description: response.data.description || '',
          contact_name: response.data.contact_name || '',
          contact_common_name: response.data.contact_common_name || '',
          email: response.data.email || '',
          phone: response.data.phone || '',
          address: response.data.address || '',
          website_url: response.data.website_url || '',
        });
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar el proveedor');
      console.error('Error fetching supplier:', err);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<SupplierFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (formData.website_url && !formData.website_url.match(/^https?:\/\/.+/)) {
      newErrors.website_url = 'URL debe comenzar con http:// o https://';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof SupplierFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Prepare data - remove empty strings for optional fields
      const submitData = { ...formData };
      Object.keys(submitData).forEach(key => {
        if (key !== 'name' && key !== 'rfc' && submitData[key as keyof SupplierFormData] === '') {
          delete submitData[key as keyof SupplierFormData];
        }
      });

      if (isEditing) {
        await apiRequest(`/suppliers/${supplierId}`, {
          method: 'PUT',
          body: JSON.stringify(submitData),
        });
      } else {
        await apiRequest('/suppliers', {
          method: 'POST',
          body: JSON.stringify(submitData),
        });
      }

      // Navigate back to supplier list or detail page
      if (isEditing) {
        navigate(`/supplier-admin/${supplierId}`);
      } else {
        navigate('/suppliers');
      }
    } catch (err: any) {
      setError(err.message || 'Error al guardar el proveedor');
      console.error('Error saving supplier:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isEditing) {
      navigate(`/supplier-admin/${supplierId}`);
    } else {
      navigate('/suppliers');
    }
  };

  const handleArchiveSupplier = async () => {
    if (!isEditing || !supplierId) return;
    
    setArchiving(true);
    setError(null);

    try {
      await apiRequest(`/suppliers/${supplierId}/archive`, {
        method: 'PATCH',
      });

      // Navigate back to supplier list after successful archive
      navigate('/suppliers', { 
        state: { message: 'Proveedor eliminado exitosamente' }
      });
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el proveedor');
      console.error('Error archiving supplier:', err);
    } finally {
      setArchiving(false);
      setShowArchiveDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="w-screen min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 overflow-x-hidden">
        <div className="container mx-auto max-w-4xl px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <Card className="p-6 sm:p-8">
            <div className="space-y-6">
              <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
              <div className="space-y-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 overflow-x-hidden">
      <div className="container mx-auto max-w-4xl px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              className="border-green-200 text-green-700 hover:bg-green-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Regresar
            </Button>
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">
            {isEditing ? 'Editar Proveedor' : 'Agregar Nuevo Proveedor'}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            {isEditing 
              ? 'Modifica la información del proveedor' 
              : 'Completa los datos del nuevo proveedor'
            }
          </p>
        </div>

        {/* Form */}
        <Card className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Información Básica
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Nombre del proveedor"
                    className={errors.name ? 'border-red-300' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600 mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre Común
                  </label>
                  <Input
                    type="text"
                    value={formData.common_name}
                    onChange={(e) => handleInputChange('common_name', e.target.value)}
                    placeholder="Nombre comercial"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Razón Social
                  </label>
                  <Input
                    type="text"
                    value={formData.legal_name}
                    onChange={(e) => handleInputChange('legal_name', e.target.value)}
                    placeholder="Razón social completa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RFC
                  </label>
                  <Input
                    type="text"
                    value={formData.rfc}
                    onChange={(e) => handleInputChange('rfc', e.target.value.toUpperCase())}
                    placeholder="RFC del proveedor"
                    className={errors.rfc ? 'border-red-300' : ''}
                  />
                  {errors.rfc && (
                    <p className="text-sm text-red-600 mt-1">{errors.rfc}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Descripción del proveedor y servicios"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Información de Contacto
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de Contacto
                  </label>
                  <Input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => handleInputChange('contact_name', e.target.value)}
                    placeholder="Nombre del contacto principal"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre Común del Contacto
                  </label>
                  <Input
                    type="text"
                    value={formData.contact_common_name}
                    onChange={(e) => handleInputChange('contact_common_name', e.target.value)}
                    placeholder="Nombre común del contacto"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="email@empresa.com"
                    className={errors.email ? 'border-red-300' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600 mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+52 55 1234 5678"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección
                </label>
                <Input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Dirección completa"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sitio Web
                </label>
                <Input
                  type="url"
                  value={formData.website_url}
                  onChange={(e) => handleInputChange('website_url', e.target.value)}
                  placeholder="https://www.empresa.com"
                  className={errors.website_url ? 'border-red-300' : ''}
                />
                {errors.website_url && (
                  <p className="text-sm text-red-600 mt-1">{errors.website_url}</p>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
              <Button
                type="submit"
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isEditing ? 'Guardando...' : 'Creando...'}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {isEditing ? 'Guardar Cambios' : 'Crear Proveedor'}
                  </>
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={submitting}
                className="flex-1 sm:flex-none"
              >
                Cancelar
              </Button>
            </div>

            {/* Danger Zone - Only show when editing */}
            {isEditing && (
              <div className="pt-8 border-t border-red-200">
                <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                  <h3 className="text-lg font-semibold text-red-800 mb-2 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Zona de Peligro
                  </h3>
                  <p className="text-red-700 text-sm mb-4">
                    Esta acción eliminará permanentemente el proveedor del sistema. Los datos asociados se conservarán pero el proveedor no aparecerá en las listas.
                  </p>
                  <Button
                    type="button"
                    onClick={() => setShowArchiveDialog(true)}
                    disabled={submitting || archiving}
                    className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar Proveedor
                  </Button>
                </div>
              </div>
            )}

            {/* Archive Confirmation Dialog */}
            {showArchiveDialog && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Confirmar Eliminación
                    </h3>
                  </div>
                  
                  <p className="text-gray-600 mb-6">
                    ¿Estás seguro de que deseas eliminar este proveedor? Esta acción moverá el proveedor a un estado archivado y no aparecerá en las listas principales.
                  </p>
                  
                  <p className="text-sm text-gray-500 mb-6">
                    <strong>Proveedor:</strong> {formData.name}
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={handleArchiveSupplier}
                      disabled={archiving}
                      className="bg-red-600 hover:bg-red-700 text-white flex-1"
                    >
                      {archiving ? (
                        <>
                          <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Eliminando...
                        </>
                      ) : (
                        'Sí, Eliminar Proveedor'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowArchiveDialog(false)}
                      disabled={archiving}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
};

export default SupplierFormPage; 
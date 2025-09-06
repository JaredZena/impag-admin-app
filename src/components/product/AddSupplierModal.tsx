import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/utils/api';

interface AddSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productId: string;
}

interface SupplierOption {
  id: number;
  name: string;
  contact_name?: string;
}

const AddSupplierModal: React.FC<AddSupplierModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  productId
}) => {
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    cost: '',
    lead_time_days: '',
    shipping_cost: '',
    is_active: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suppliersLoading, setSuppliersLoading] = useState(false);

  // Fetch suppliers when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSuppliers();
    }
  }, [isOpen]);

  const fetchSuppliers = async () => {
    setSuppliersLoading(true);
    try {
      const response = await apiRequest('/suppliers');
      setSuppliers(response.data || []);
    } catch (err: any) {
      console.error('Error fetching suppliers:', err);
      setError('Error al cargar proveedores');
    } finally {
      setSuppliersLoading(false);
    }
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name && supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSupplierId) {
      setError('Por favor selecciona un proveedor');
      return;
    }

    if (!formData.cost) {
      setError('Por favor ingresa el precio');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const submitData = {
        product_id: parseInt(productId),
        supplier_id: selectedSupplierId,
        cost: parseFloat(formData.cost),
        lead_time_days: formData.lead_time_days ? parseInt(formData.lead_time_days) : null,
        shipping_cost: formData.shipping_cost ? parseFloat(formData.shipping_cost) : null,
        is_active: formData.is_active
      };

      await apiRequest('/products/supplier-products', {
        method: 'POST',
        body: JSON.stringify(submitData)
      });

      // Reset form
      setSelectedSupplierId(null);
      setFormData({
        cost: '',
        lead_time_days: '',
        shipping_cost: '',
        is_active: true
      });
      setSearchTerm('');
      
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating supplier-product relationship:', err);
      setError(err.message || 'Error al agregar proveedor');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedSupplierId(null);
    setFormData({
      cost: '',
      lead_time_days: '',
      shipping_cost: '',
      is_active: true
    });
    setSearchTerm('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Agregar Nuevo Proveedor
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Supplier Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Proveedor *
              </label>
              
              {/* Search Input */}
              <div className="relative mb-3">
                <Input
                  type="text"
                  placeholder="Buscar proveedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Supplier List */}
              <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                {suppliersLoading ? (
                  <div className="p-4 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto"></div>
                    <p className="text-sm text-gray-600 mt-2">Cargando proveedores...</p>
                  </div>
                ) : filteredSuppliers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    {searchTerm ? 'No se encontraron proveedores' : 'No hay proveedores disponibles'}
                  </div>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <div
                      key={supplier.id}
                      className={`p-3 border-b border-gray-100 cursor-pointer transition-colors ${
                        selectedSupplierId === supplier.id
                          ? 'bg-green-50 border-green-200'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedSupplierId(supplier.id)}
                    >
                      <div className="flex items-center">
                        <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                          selectedSupplierId === supplier.id
                            ? 'bg-green-600 border-green-600'
                            : 'border-gray-300'
                        }`}>
                          {selectedSupplierId === supplier.id && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{supplier.name || 'Sin nombre'}</p>
                          {supplier.contact_name && (
                            <p className="text-sm text-gray-600">{supplier.contact_name}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.cost}
                  onChange={(e) => handleInputChange('cost', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tiempo de Entrega (días)
                </label>
                <Input
                  type="number"
                  placeholder="7"
                  value={formData.lead_time_days}
                  onChange={(e) => handleInputChange('lead_time_days', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Costo de Envío
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.shipping_cost}
                  onChange={(e) => handleInputChange('shipping_cost', e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => handleInputChange('is_active', e.target.checked)}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Activo
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !selectedSupplierId}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Agregando...' : 'Agregar Proveedor'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default AddSupplierModal;

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/utils/api';

interface Supplier {
  id: number;
  name: string;
  contact_name?: string;
  email?: string;
}

interface Product {
  id: number;
  name: string;
  sku: string;
  category_name?: string;
}

interface SupplierProduct {
  id: number;
  supplier_id: number;
  product_id: number;
  supplier_sku?: string;
  cost?: number;
  stock: number;
  lead_time_days?: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
  supplier?: Supplier;
  product?: Product;
}

const SupplierProductManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [relationships, setRelationships] = useState<SupplierProduct[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all data in parallel
      const [relationshipsData, suppliersData, productsData, categoriesData] = await Promise.all([
        apiRequest('/products/supplier-product/'),
        apiRequest('/suppliers'),
        apiRequest('/products'),
        apiRequest('/categories')
      ]);

      // Create category lookup
      const categoryMap = (categoriesData.data || []).reduce((acc: any, cat: any) => {
        acc[cat.id] = cat.name;
        return acc;
      }, {});

      // Enrich relationships with supplier and product data
      const enrichedRelationships = await Promise.all(
        (relationshipsData || []).map(async (rel: SupplierProduct) => {
          try {
            const [supplierData, productData] = await Promise.all([
              apiRequest(`/suppliers/${rel.supplier_id}`),
              apiRequest(`/products/${rel.product_id}`)
            ]);

            return {
              ...rel,
              supplier: supplierData.data,
              product: {
                ...productData.data,
                category_name: categoryMap[productData.data.category_id] || 'Sin categoría'
              }
            };
          } catch (err) {
            console.error('Error fetching relationship details:', err);
            return rel;
          }
        })
      );

      setRelationships(enrichedRelationships);
      setSuppliers(suppliersData.data || []);
      setProducts((productsData.data || []).map((p: any) => ({
        ...p,
        category_name: categoryMap[p.category_id] || 'Sin categoría'
      })));
    } catch (err: any) {
      setError(err.message || 'Error al cargar los datos');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRelationships = relationships.filter(rel => {
    const matchesSearch = !searchTerm || 
      rel.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rel.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rel.supplier_sku?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSupplier = !filterSupplier || rel.supplier_id.toString() === filterSupplier;
    
    return matchesSearch && matchesSupplier;
  });

  const handleAddRelationship = () => {
    setShowAddDialog(true);
  };

  const handleEditRelationship = (relationshipId: number) => {
    navigate(`/supplier-product-admin/edit/${relationshipId}`);
  };

  if (loading) {
    return (
      <div className="w-screen min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 overflow-x-hidden">
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <div className="mb-8">
            <div className="h-10 w-64 bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="h-6 w-96 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <Card className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
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
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <Card className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error al Cargar Datos</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchData} className="bg-green-600 hover:bg-green-700 text-white">
              Intentar de Nuevo
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 overflow-x-hidden">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent mb-2">
                Relaciones Proveedor-Producto
              </h1>
              <p className="text-gray-600">Gestiona las relaciones entre proveedores y productos con precios específicos</p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline"
                onClick={() => navigate('/product-admin')}
                className="border-green-200 text-green-700 hover:bg-green-50"
              >
                Ver Productos
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/suppliers')}
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                Ver Proveedores
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <Card className="p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Buscar
                </label>
                <Input
                  placeholder="Buscar por proveedor, producto o SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filtrar por Proveedor
                </label>
                <select
                  value={filterSupplier}
                  onChange={(e) => setFilterSupplier(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none bg-white"
                >
                  <option value="">Todos los proveedores</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleAddRelationship}
                  className="bg-green-600 hover:bg-green-700 text-white w-full"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Agregar Relación
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Results */}
        <Card className="shadow-lg border-0 rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-blue-100 p-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Relaciones Activas
              <span className="ml-2 text-sm font-normal text-gray-500">({filteredRelationships.length})</span>
            </h3>
          </div>

          <div className="p-4">
            {filteredRelationships.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="flex flex-col items-center justify-center">
                  <div className="w-16 h-16 mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <p className="font-medium">
                    {searchTerm || filterSupplier ? 'No se encontraron relaciones' : 'No hay relaciones configuradas'}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    {searchTerm || filterSupplier 
                      ? 'Intenta ajustar los filtros de búsqueda' 
                      : 'Comienza agregando una relación proveedor-producto'
                    }
                  </p>
                  {!searchTerm && !filterSupplier && (
                    <Button 
                      onClick={handleAddRelationship}
                      className="mt-4 bg-green-600 hover:bg-green-700 text-white"
                    >
                      Agregar Primera Relación
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRelationships.map((relationship) => (
                  <div 
                    key={relationship.id}
                    className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-cyan-50/30 transition-all duration-200"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-3 gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 mb-1">
                          {relationship.supplier?.name} → {relationship.product?.name}
                        </h4>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            Proveedor: {relationship.supplier?.name}
                          </span>
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            Producto: {relationship.product?.sku}
                          </span>
                          {relationship.supplier_sku && (
                            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                              SKU Proveedor: {relationship.supplier_sku}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          relationship.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {relationship.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditRelationship(relationship.id)}
                          className="border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Editar
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 block">Precio/Costo:</span>
                        <div className="font-semibold text-gray-900">
                          {relationship.cost !== null ? `$${Number(relationship.cost).toLocaleString()}` : 'No definido'}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Stock:</span>
                        <div className={`font-medium ${
                          (relationship.stock || 0) > 50 ? 'text-green-600' : 
                          (relationship.stock || 0) > 10 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {relationship.stock || 0} unidades
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Tiempo de Entrega:</span>
                        <div className="font-medium text-gray-900">
                          {relationship.lead_time_days !== null ? `${relationship.lead_time_days} días` : 'No especificado'}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Categoría:</span>
                        <div className="font-medium text-gray-900">
                          {relationship.product?.category_name || 'Sin categoría'}
                        </div>
                      </div>
                    </div>
                    
                    {relationship.notes && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <span className="text-gray-500 text-sm block mb-1">Notas:</span>
                        <p className="text-sm text-gray-700">{relationship.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Add Dialog would go here - simplified for now */}
        {showAddDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Agregar Nueva Relación</h3>
              <p className="text-gray-600 mb-4">
                Para agregar una nueva relación proveedor-producto, utiliza el formulario de edición completo.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowAddDialog(false);
                    navigate('/supplier-product-admin/new');
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white flex-1"
                >
                  Ir al Formulario
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierProductManagementPage;
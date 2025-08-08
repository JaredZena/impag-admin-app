import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/utils/api';
const SupplierProductManagementPage = () => {
    const navigate = useNavigate();
    const [relationships, setRelationships] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
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
            const categoryMap = (categoriesData.data || []).reduce((acc, cat) => {
                acc[cat.id] = cat.name;
                return acc;
            }, {});
            // Enrich relationships with supplier and product data
            const enrichedRelationships = await Promise.all((relationshipsData || []).map(async (rel) => {
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
                }
                catch (err) {
                    console.error('Error fetching relationship details:', err);
                    return rel;
                }
            }));
            setRelationships(enrichedRelationships);
            setSuppliers(suppliersData.data || []);
            setProducts((productsData.data || []).map((p) => ({
                ...p,
                category_name: categoryMap[p.category_id] || 'Sin categoría'
            })));
        }
        catch (err) {
            setError(err.message || 'Error al cargar los datos');
            console.error('Error fetching data:', err);
        }
        finally {
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
    const handleEditRelationship = (relationshipId) => {
        navigate(`/supplier-product-admin/edit/${relationshipId}`);
    };
    if (loading) {
        return (_jsx("div", { className: "w-screen min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 overflow-x-hidden", children: _jsxs("div", { className: "container mx-auto max-w-7xl px-4 py-8", children: [_jsxs("div", { className: "mb-8", children: [_jsx("div", { className: "h-10 w-64 bg-gray-200 rounded animate-pulse mb-4" }), _jsx("div", { className: "h-6 w-96 bg-gray-200 rounded animate-pulse" })] }), _jsx(Card, { className: "p-6", children: _jsx("div", { className: "space-y-4", children: Array.from({ length: 5 }).map((_, i) => (_jsx("div", { className: "h-20 bg-gray-200 rounded animate-pulse" }, i))) }) })] }) }));
    }
    if (error) {
        return (_jsx("div", { className: "w-screen min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 overflow-x-hidden", children: _jsx("div", { className: "container mx-auto max-w-7xl px-4 py-8", children: _jsxs(Card, { className: "p-8 text-center", children: [_jsx("div", { className: "w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center", children: _jsx("svg", { className: "w-8 h-8 text-red-500", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) }) }), _jsx("h2", { className: "text-xl font-semibold text-gray-900 mb-2", children: "Error al Cargar Datos" }), _jsx("p", { className: "text-gray-600 mb-4", children: error }), _jsx(Button, { onClick: fetchData, className: "bg-green-600 hover:bg-green-700 text-white", children: "Intentar de Nuevo" })] }) }) }));
    }
    return (_jsx("div", { className: "w-screen min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 overflow-x-hidden", children: _jsxs("div", { className: "container mx-auto max-w-7xl px-4 py-8", children: [_jsxs("div", { className: "mb-8", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent mb-2", children: "Relaciones Proveedor-Producto" }), _jsx("p", { className: "text-gray-600", children: "Gestiona las relaciones entre proveedores y productos con precios espec\u00EDficos" })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx(Button, { variant: "outline", onClick: () => navigate('/product-admin'), className: "border-green-200 text-green-700 hover:bg-green-50", children: "Ver Productos" }), _jsx(Button, { variant: "outline", onClick: () => navigate('/suppliers'), className: "border-blue-200 text-blue-700 hover:bg-blue-50", children: "Ver Proveedores" })] })] }), _jsx(Card, { className: "p-4 mb-6", children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Buscar" }), _jsx(Input, { placeholder: "Buscar por proveedor, producto o SKU...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "w-full" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Filtrar por Proveedor" }), _jsxs("select", { value: filterSupplier, onChange: (e) => setFilterSupplier(e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none bg-white", children: [_jsx("option", { value: "", children: "Todos los proveedores" }), suppliers.map(supplier => (_jsx("option", { value: supplier.id, children: supplier.name }, supplier.id)))] })] }), _jsx("div", { className: "flex items-end", children: _jsxs(Button, { onClick: handleAddRelationship, className: "bg-green-600 hover:bg-green-700 text-white w-full", children: [_jsx("svg", { className: "w-4 h-4 mr-2", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 6v6m0 0v6m0-6h6m-6 0H6" }) }), "Agregar Relaci\u00F3n"] }) })] }) })] }), _jsxs(Card, { className: "shadow-lg border-0 rounded-xl overflow-hidden", children: [_jsx("div", { className: "bg-gradient-to-r from-gray-50 to-blue-50 border-b border-blue-100 p-4", children: _jsxs("h3", { className: "text-lg font-semibold text-gray-900 flex items-center", children: [_jsx("svg", { className: "w-5 h-5 mr-2 text-blue-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" }) }), "Relaciones Activas", _jsxs("span", { className: "ml-2 text-sm font-normal text-gray-500", children: ["(", filteredRelationships.length, ")"] })] }) }), _jsx("div", { className: "p-4", children: filteredRelationships.length === 0 ? (_jsx("div", { className: "text-center py-12 text-gray-500", children: _jsxs("div", { className: "flex flex-col items-center justify-center", children: [_jsx("div", { className: "w-16 h-16 mb-4 bg-gray-100 rounded-full flex items-center justify-center", children: _jsx("svg", { className: "w-8 h-8 text-gray-400", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" }) }) }), _jsx("p", { className: "font-medium", children: searchTerm || filterSupplier ? 'No se encontraron relaciones' : 'No hay relaciones configuradas' }), _jsx("p", { className: "text-sm text-gray-400 mt-1", children: searchTerm || filterSupplier
                                                ? 'Intenta ajustar los filtros de búsqueda'
                                                : 'Comienza agregando una relación proveedor-producto' }), !searchTerm && !filterSupplier && (_jsx(Button, { onClick: handleAddRelationship, className: "mt-4 bg-green-600 hover:bg-green-700 text-white", children: "Agregar Primera Relaci\u00F3n" }))] }) })) : (_jsx("div", { className: "space-y-4", children: filteredRelationships.map((relationship) => (_jsxs("div", { className: "p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-cyan-50/30 transition-all duration-200", children: [_jsxs("div", { className: "flex flex-col lg:flex-row lg:items-center lg:justify-between mb-3 gap-3", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("h4", { className: "font-semibold text-gray-900 mb-1", children: [relationship.supplier?.name, " \u2192 ", relationship.product?.name] }), _jsxs("div", { className: "flex flex-wrap gap-2 text-xs", children: [_jsxs("span", { className: "bg-blue-100 text-blue-800 px-2 py-1 rounded-full", children: ["Proveedor: ", relationship.supplier?.name] }), _jsxs("span", { className: "bg-green-100 text-green-800 px-2 py-1 rounded-full", children: ["Producto: ", relationship.product?.sku] }), relationship.supplier_sku && (_jsxs("span", { className: "bg-gray-100 text-gray-800 px-2 py-1 rounded-full", children: ["SKU Proveedor: ", relationship.supplier_sku] }))] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${relationship.is_active
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-gray-100 text-gray-800'}`, children: relationship.is_active ? 'Activo' : 'Inactivo' }), _jsxs(Button, { size: "sm", variant: "outline", onClick: () => handleEditRelationship(relationship.id), className: "border-blue-200 text-blue-700 hover:bg-blue-50", children: [_jsx("svg", { className: "w-3 h-3 mr-1", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" }) }), "Editar"] })] })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "text-gray-500 block", children: "Precio/Costo:" }), _jsx("div", { className: "font-semibold text-gray-900", children: relationship.cost !== null ? `$${Number(relationship.cost).toLocaleString()}` : 'No definido' })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-500 block", children: "Stock:" }), _jsxs("div", { className: `font-medium ${(relationship.stock || 0) > 50 ? 'text-green-600' :
                                                                (relationship.stock || 0) > 10 ? 'text-yellow-600' : 'text-red-600'}`, children: [relationship.stock || 0, " unidades"] })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-500 block", children: "Tiempo de Entrega:" }), _jsx("div", { className: "font-medium text-gray-900", children: relationship.lead_time_days !== null ? `${relationship.lead_time_days} días` : 'No especificado' })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-500 block", children: "Categor\u00EDa:" }), _jsx("div", { className: "font-medium text-gray-900", children: relationship.product?.category_name || 'Sin categoría' })] })] }), relationship.notes && (_jsxs("div", { className: "mt-3 pt-3 border-t border-gray-100", children: [_jsx("span", { className: "text-gray-500 text-sm block mb-1", children: "Notas:" }), _jsx("p", { className: "text-sm text-gray-700", children: relationship.notes })] }))] }, relationship.id))) })) })] }), showAddDialog && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4", children: _jsxs("div", { className: "bg-white rounded-lg p-6 max-w-md w-full", children: [_jsx("h3", { className: "text-lg font-semibold mb-4", children: "Agregar Nueva Relaci\u00F3n" }), _jsx("p", { className: "text-gray-600 mb-4", children: "Para agregar una nueva relaci\u00F3n proveedor-producto, utiliza el formulario de edici\u00F3n completo." }), _jsxs("div", { className: "flex gap-3", children: [_jsx(Button, { onClick: () => {
                                            setShowAddDialog(false);
                                            navigate('/supplier-product-admin/new');
                                        }, className: "bg-green-600 hover:bg-green-700 text-white flex-1", children: "Ir al Formulario" }), _jsx(Button, { variant: "outline", onClick: () => setShowAddDialog(false), className: "flex-1", children: "Cancelar" })] })] }) }))] }) }));
};
export default SupplierProductManagementPage;

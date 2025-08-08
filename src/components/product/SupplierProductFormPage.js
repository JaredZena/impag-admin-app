import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/utils/api';
const SupplierProductFormPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = !!id;
    const [formData, setFormData] = useState({
        supplier_id: 0,
        product_id: 0,
        supplier_sku: '',
        cost: null,
        stock: 0,
        lead_time_days: null,
        is_active: true,
        notes: ''
    });
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        fetchData();
    }, [id]);
    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch suppliers, products, and categories in parallel
            const [suppliersData, productsData, categoriesData] = await Promise.all([
                apiRequest('/suppliers'),
                apiRequest('/products'),
                apiRequest('/categories')
            ]);
            // Create category lookup
            const categoryMap = (categoriesData.data || []).reduce((acc, cat) => {
                acc[cat.id] = cat.name;
                return acc;
            }, {});
            setSuppliers(suppliersData.data || []);
            setProducts((productsData.data || []).map((p) => ({
                ...p,
                category_name: categoryMap[p.category_id] || 'Sin categoría'
            })));
            // If editing, fetch the existing relationship
            if (isEditing) {
                const relationshipData = await apiRequest(`/products/supplier-product/${id}`);
                if (relationshipData) {
                    setFormData({
                        supplier_id: relationshipData.supplier_id,
                        product_id: relationshipData.product_id,
                        supplier_sku: relationshipData.supplier_sku || '',
                        cost: relationshipData.cost,
                        stock: relationshipData.stock || 0,
                        lead_time_days: relationshipData.lead_time_days,
                        is_active: relationshipData.is_active,
                        notes: relationshipData.notes || ''
                    });
                }
            }
        }
        catch (err) {
            setError(err.message || 'Error al cargar los datos');
            console.error('Error fetching data:', err);
        }
        finally {
            setLoading(false);
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const submitData = {
                ...formData,
                cost: formData.cost === null || formData.cost === 0 ? null : formData.cost,
                lead_time_days: formData.lead_time_days === null || formData.lead_time_days === 0 ? null : formData.lead_time_days
            };
            if (isEditing) {
                await apiRequest(`/products/supplier-product/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(submitData)
                });
            }
            else {
                await apiRequest('/products/supplier-product/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(submitData)
                });
            }
            navigate('/supplier-product-admin', {
                state: {
                    message: isEditing
                        ? 'Relación actualizada exitosamente'
                        : 'Relación creada exitosamente'
                }
            });
        }
        catch (err) {
            setError(err.message || 'Error al guardar la relación');
        }
        finally {
            setSaving(false);
        }
    };
    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };
    if (loading) {
        return (_jsx("div", { className: "w-screen min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 overflow-x-hidden", children: _jsxs("div", { className: "container mx-auto max-w-4xl px-4 py-8", children: [_jsxs("div", { className: "mb-8", children: [_jsx("div", { className: "h-10 w-96 bg-gray-200 rounded animate-pulse mb-4" }), _jsx("div", { className: "h-6 w-64 bg-gray-200 rounded animate-pulse" })] }), _jsx(Card, { className: "p-6", children: _jsx("div", { className: "space-y-6", children: Array.from({ length: 6 }).map((_, i) => (_jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "h-4 w-24 bg-gray-200 rounded animate-pulse" }), _jsx("div", { className: "h-10 w-full bg-gray-200 rounded animate-pulse" })] }, i))) }) })] }) }));
    }
    return (_jsx("div", { className: "w-screen min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 overflow-x-hidden", children: _jsxs("div", { className: "container mx-auto max-w-4xl px-4 py-8", children: [_jsx("div", { className: "mb-8", children: _jsxs("div", { className: "flex items-center gap-4 mb-6", children: [_jsxs(Button, { variant: "outline", onClick: () => navigate('/supplier-product-admin'), className: "border-gray-200 text-gray-700 hover:bg-gray-50", children: [_jsx("svg", { className: "w-4 h-4 mr-2", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 19l-7-7 7-7" }) }), "Volver"] }), _jsxs("div", { children: [_jsxs("h1", { className: "text-3xl font-bold bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent mb-2", children: [isEditing ? 'Editar Relación' : 'Nueva Relación', " Proveedor-Producto"] }), _jsx("p", { className: "text-gray-600", children: isEditing ? 'Modifica la información de la relación' : 'Configura una nueva relación entre proveedor y producto' })] })] }) }), error && (_jsx(Card, { className: "mb-6 p-4 bg-red-50 border-red-200", children: _jsxs("div", { className: "flex items-center", children: [_jsx("svg", { className: "w-5 h-5 text-red-500 mr-2", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) }), _jsx("span", { className: "text-red-700", children: error })] }) })), _jsx(Card, { className: "p-6 shadow-lg border-0 rounded-xl", children: _jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Proveedor *" }), _jsxs("select", { value: formData.supplier_id, onChange: (e) => handleInputChange('supplier_id', parseInt(e.target.value)), required: true, className: "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white", children: [_jsx("option", { value: 0, children: "Seleccionar proveedor..." }), suppliers.map(supplier => (_jsx("option", { value: supplier.id, children: supplier.name }, supplier.id)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Producto *" }), _jsxs("select", { value: formData.product_id, onChange: (e) => handleInputChange('product_id', parseInt(e.target.value)), required: true, className: "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white", children: [_jsx("option", { value: 0, children: "Seleccionar producto..." }), products.map(product => (_jsxs("option", { value: product.id, children: [product.name, " (", product.sku, ") - ", product.category_name] }, product.id)))] })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "SKU del Proveedor" }), _jsx(Input, { type: "text", value: formData.supplier_sku, onChange: (e) => handleInputChange('supplier_sku', e.target.value), placeholder: "SKU espec\u00EDfico del proveedor", className: "w-full" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Costo" }), _jsx(Input, { type: "number", step: "0.01", min: "0", value: formData.cost || '', onChange: (e) => handleInputChange('cost', e.target.value ? parseFloat(e.target.value) : null), placeholder: "0.00", className: "w-full" })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Stock *" }), _jsx(Input, { type: "number", min: "0", value: formData.stock, onChange: (e) => handleInputChange('stock', parseInt(e.target.value) || 0), placeholder: "0", required: true, className: "w-full" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Tiempo de Entrega (d\u00EDas)" }), _jsx(Input, { type: "number", min: "0", value: formData.lead_time_days || '', onChange: (e) => handleInputChange('lead_time_days', e.target.value ? parseInt(e.target.value) : null), placeholder: "0", className: "w-full" })] })] }), _jsx("div", { children: _jsxs("label", { className: "flex items-center space-x-2", children: [_jsx("input", { type: "checkbox", checked: formData.is_active, onChange: (e) => handleInputChange('is_active', e.target.checked), className: "rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" }), _jsx("span", { className: "text-sm font-medium text-gray-700", children: "Relaci\u00F3n activa" })] }) }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Notas" }), _jsx("textarea", { value: formData.notes, onChange: (e) => handleInputChange('notes', e.target.value), placeholder: "Notas adicionales sobre esta relaci\u00F3n proveedor-producto...", rows: 4, className: "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-vertical" })] }), _jsxs("div", { className: "flex gap-4 pt-6 border-t border-gray-200", children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => navigate('/supplier-product-admin'), className: "flex-1", children: "Cancelar" }), _jsx(Button, { type: "submit", disabled: saving || formData.supplier_id === 0 || formData.product_id === 0, className: "flex-1 bg-blue-600 hover:bg-blue-700 text-white", children: saving ? (_jsxs(_Fragment, { children: [_jsxs("svg", { className: "animate-spin -ml-1 mr-3 h-5 w-5 text-white", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })] }), "Guardando..."] })) : (isEditing ? 'Actualizar Relación' : 'Crear Relación') })] })] }) })] }) }));
};
export default SupplierProductFormPage;

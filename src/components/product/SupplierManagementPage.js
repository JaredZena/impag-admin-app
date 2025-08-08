import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiRequest } from '@/utils/api';
import SupplierSearchBar from './SupplierSearchBar';
const SupplierManagementPage = () => {
    const navigate = useNavigate();
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({ name: '', contact: '', email: '' });
    const fetchSuppliers = useCallback(async (searchFilters, isInitialLoad = false) => {
        if (isInitialLoad) {
            setLoading(true);
        }
        else {
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
        }
        catch (err) {
            setError(err.message || 'Error al cargar proveedores');
            console.error('Error fetching suppliers:', err);
        }
        finally {
            if (isInitialLoad) {
                setLoading(false);
            }
            else {
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
        if (loading)
            return;
        // Debounce the search to avoid too many API calls
        const timeoutId = setTimeout(() => {
            fetchSuppliers(filters, false);
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [filters, fetchSuppliers, loading]);
    const handleSupplierClick = (supplierId) => {
        navigate(`/supplier-admin/${supplierId}`);
    };
    const handleEditSupplier = (supplierId, event) => {
        event.stopPropagation();
        navigate(`/supplier-admin/edit/${supplierId}`);
    };
    const handleAddSupplier = () => {
        navigate('/supplier-admin/new');
    };
    // Handlers for search/filter changes
    const handleNameChange = (value) => setFilters(f => ({ ...f, name: value }));
    const handleContactChange = (value) => setFilters(f => ({ ...f, contact: value }));
    const handleEmailChange = (value) => setFilters(f => ({ ...f, email: value }));
    if (loading) {
        return (_jsx("div", { className: "w-screen min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 overflow-x-hidden", children: _jsxs("div", { className: "container mx-auto max-w-7xl 2xl:max-w-screen-2xl px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 py-4 sm:py-6 lg:py-8", children: [_jsxs("div", { className: "mb-6 sm:mb-8", children: [_jsx("div", { className: "h-8 sm:h-10 w-48 bg-gray-200 rounded animate-pulse mb-4" }), _jsx("div", { className: "h-12 w-full bg-gray-200 rounded animate-pulse mb-4" }), _jsx("div", { className: "h-10 w-32 bg-gray-200 rounded animate-pulse" })] }), _jsx(Card, { className: "p-4 sm:p-6 md:p-8", children: _jsx("div", { className: "space-y-4", children: Array.from({ length: 5 }).map((_, i) => (_jsxs("div", { className: "space-y-2 p-4 border rounded", children: [_jsx("div", { className: "h-5 w-48 bg-gray-200 rounded animate-pulse" }), _jsx("div", { className: "h-4 w-32 bg-gray-200 rounded animate-pulse" }), _jsx("div", { className: "h-4 w-64 bg-gray-200 rounded animate-pulse" })] }, i))) }) })] }) }));
    }
    if (error) {
        return (_jsx("div", { className: "w-screen min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 overflow-x-hidden", children: _jsx("div", { className: "container mx-auto max-w-7xl 2xl:max-w-screen-2xl px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 py-4 sm:py-6 lg:py-8", children: _jsxs(Card, { className: "p-6 sm:p-8 text-center", children: [_jsx("div", { className: "w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-red-100 rounded-full flex items-center justify-center", children: _jsx("svg", { className: "w-6 h-6 sm:w-8 sm:h-8 text-red-500", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) }) }), _jsx("h2", { className: "text-lg sm:text-xl font-semibold text-gray-900 mb-2", children: "Error al Cargar Proveedores" }), _jsx("p", { className: "text-sm sm:text-base text-gray-600 mb-4", children: error }), _jsx(Button, { onClick: () => fetchSuppliers(filters, false), className: "bg-green-600 hover:bg-green-700 text-sm sm:text-base", children: "Intentar de Nuevo" })] }) }) }));
    }
    return (_jsx("div", { className: "w-screen min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 overflow-x-hidden", children: _jsxs("div", { className: "container mx-auto max-w-7xl 2xl:max-w-screen-2xl px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 py-4 sm:py-6 lg:py-8", children: [_jsxs("div", { className: "mb-6 sm:mb-8", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent mb-2", children: "Gesti\u00F3n de Proveedores" }), _jsx("p", { className: "text-sm sm:text-base text-gray-600", children: "Administra tu directorio de proveedores y contactos" })] }), _jsxs("div", { className: "flex gap-3", children: [_jsxs(Button, { onClick: () => navigate('/product-admin'), variant: "outline", className: "border-green-200 text-green-700 hover:bg-green-50 whitespace-nowrap", children: [_jsx("svg", { className: "w-4 h-4 mr-2", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-4V8a1 1 0 00-1-1H7a1 1 0 00-1 1v1m0 4h.01" }) }), "Gestionar Productos"] }), _jsxs(Button, { onClick: () => navigate('/supplier-product-admin'), variant: "outline", className: "border-purple-200 text-purple-700 hover:bg-purple-50 whitespace-nowrap", children: [_jsx("svg", { className: "w-4 h-4 mr-2", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" }) }), "Relaciones Proveedor-Producto"] })] })] }), _jsx("div", { className: "flex justify-end mb-6", children: _jsxs(Button, { onClick: handleAddSupplier, className: "bg-green-600 hover:bg-green-700 text-white whitespace-nowrap", children: [_jsx("svg", { className: "w-4 h-4 mr-2", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 6v6m0 0v6m0-6h6m-6 0H6" }) }), "Agregar Nuevo Proveedor"] }) })] }), _jsx(Card, { className: "p-3 sm:p-4 md:p-6 mb-6 sm:mb-8 shadow-lg border-0 rounded-xl", children: _jsx(SupplierSearchBar, { name: filters.name, contact: filters.contact, email: filters.email, onNameChange: handleNameChange, onContactChange: handleContactChange, onEmailChange: handleEmailChange }) }), _jsxs(Card, { className: "shadow-lg border-0 rounded-xl overflow-hidden", children: [_jsx("div", { className: "bg-gradient-to-r from-gray-50 to-green-50 border-b border-green-100 p-3 sm:p-4 md:p-6", children: _jsxs("h3", { className: "text-lg sm:text-xl font-semibold text-gray-900 flex items-center", children: [_jsx("svg", { className: "w-4 h-4 sm:w-5 sm:h-5 mr-2 text-green-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" }) }), _jsx("span", { className: "text-sm sm:text-lg", children: "Proveedores" }), _jsxs("span", { className: "ml-2 text-xs sm:text-sm font-normal text-gray-500", children: ["(", suppliers.length, ")"] })] }) }), _jsx("div", { className: "p-3 sm:p-4", children: searchLoading ? (_jsx("div", { className: "text-center py-8 sm:py-12", children: _jsxs("div", { className: "flex flex-col items-center justify-center", children: [_jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-4" }), _jsx("p", { className: "text-sm text-gray-600", children: "Buscando proveedores..." })] }) })) : suppliers.length === 0 ? (_jsx("div", { className: "text-center py-8 sm:py-12 text-gray-500", children: _jsxs("div", { className: "flex flex-col items-center justify-center", children: [_jsx("div", { className: "w-12 h-12 sm:w-16 sm:h-16 mb-3 sm:mb-4 bg-gray-100 rounded-full flex items-center justify-center", children: _jsx("svg", { className: "w-6 h-6 sm:w-8 sm:h-8 text-gray-400", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" }) }) }), _jsx("p", { className: "font-medium text-sm sm:text-base", children: (filters.name || filters.contact || filters.email) ? 'No se encontraron proveedores' : 'No hay proveedores registrados' }), _jsx("p", { className: "text-xs sm:text-sm text-gray-400 mt-1", children: (filters.name || filters.contact || filters.email)
                                                ? 'No hay proveedores que coincidan con los filtros aplicados'
                                                : 'Comienza agregando tu primer proveedor' }), !(filters.name || filters.contact || filters.email) && (_jsx(Button, { onClick: handleAddSupplier, className: "mt-4 bg-green-600 hover:bg-green-700 text-white", children: "Agregar Primer Proveedor" }))] }) })) : (_jsx("div", { className: "space-y-3 sm:space-y-4", children: suppliers.map((supplier, index) => (_jsxs("div", { className: `p-3 sm:p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-gradient-to-r hover:from-green-50/30 hover:to-emerald-50/30 transition-all duration-200 cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`, onClick: () => handleSupplierClick(supplier.id), children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 sm:mb-3 gap-2 sm:gap-0", children: [_jsxs("div", { children: [_jsx("h4", { className: "font-semibold text-gray-900 hover:text-green-700 transition-colors duration-200 text-sm sm:text-base break-words", children: supplier.name || 'Proveedor Sin Nombre' }), supplier.common_name && supplier.common_name !== supplier.name && (_jsx("p", { className: "text-xs sm:text-sm text-gray-600 mt-1", children: supplier.common_name }))] }), _jsx("div", { className: "flex items-center gap-2", children: _jsxs(Button, { size: "sm", variant: "outline", onClick: (e) => handleEditSupplier(supplier.id, e), className: "border-blue-200 text-blue-700 hover:bg-blue-50 text-xs px-2 py-1", children: [_jsx("svg", { className: "w-3 h-3 mr-1", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" }) }), "Editar"] }) })] }), _jsxs("div", { className: "sm:hidden grid grid-cols-1 gap-2 text-xs", children: [_jsxs("div", { children: [_jsx("span", { className: "text-gray-500 block", children: "Contacto:" }), _jsx("div", { className: "font-medium text-gray-900 mt-1", children: supplier.contact_name || 'N/A' })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-500 block", children: "Tel\u00E9fono:" }), _jsx("div", { className: "font-medium text-gray-900 mt-1", children: supplier.phone || 'N/A' })] })] }), _jsxs("div", { className: "hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "text-gray-500 block sm:inline", children: "RFC:" }), _jsx("div", { className: "font-medium text-gray-900 mt-1 sm:mt-0 sm:ml-1 sm:inline", children: supplier.rfc || 'N/A' })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-500 block sm:inline", children: "Contacto:" }), _jsx("div", { className: "font-medium text-gray-900 mt-1 sm:mt-0 sm:ml-1 sm:inline", children: supplier.contact_name || 'N/A' })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-500 block sm:inline", children: "Email:" }), _jsx("div", { className: "font-medium text-gray-900 mt-1 sm:mt-0 sm:ml-1 sm:inline break-all", children: supplier.email || 'N/A' })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-500 block sm:inline", children: "Tel\u00E9fono:" }), _jsx("div", { className: "font-medium text-gray-900 mt-1 sm:mt-0 sm:ml-1 sm:inline", children: supplier.phone || 'N/A' })] }), _jsxs("div", { className: "sm:col-span-2", children: [_jsx("span", { className: "text-gray-500 block sm:inline", children: "Direcci\u00F3n:" }), _jsx("div", { className: "font-medium text-gray-900 mt-1 sm:mt-0 sm:ml-1 sm:inline", children: supplier.address || 'N/A' })] })] }), supplier.description && (_jsx("div", { className: "hidden sm:block mt-3 pt-3 border-t border-gray-100", children: _jsx("p", { className: "text-xs sm:text-sm text-gray-600", children: supplier.description }) }))] }, supplier.id))) })) })] })] }) }));
};
export default SupplierManagementPage;

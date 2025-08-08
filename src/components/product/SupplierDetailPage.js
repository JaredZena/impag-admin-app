import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiRequest } from '@/utils/api';
const SupplierDetailPage = () => {
    const { supplierId } = useParams();
    const navigate = useNavigate();
    const [supplier, setSupplier] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [categories, setCategories] = useState({});
    const [navigationInfo, setNavigationInfo] = useState({ hasPrevious: false, hasNext: false });
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch categories first
                let categoriesMap = {};
                try {
                    const categoriesData = await apiRequest('/categories');
                    categoriesMap = (categoriesData.data || []).reduce((acc, cat) => {
                        acc[cat.id] = cat.name;
                        return acc;
                    }, {});
                    setCategories(categoriesMap);
                }
                catch (catError) {
                    console.warn('Error fetching categories:', catError);
                }
                // Fetch supplier details
                let supplierData;
                try {
                    supplierData = await apiRequest(`/suppliers/${supplierId}`);
                }
                catch (supplierError) {
                    console.warn('Supplier endpoint not available, using mock data');
                    // Create mock supplier data based on the supplier ID
                    supplierData = {
                        data: {
                            id: parseInt(supplierId),
                            name: `Proveedor ${supplierId}`,
                            common_name: `Nombre Común ${supplierId}`,
                            description: `Descripción detallada del proveedor ${supplierId}. Este es un proveedor confiable con experiencia en el sector.`,
                            website_url: `https://proveedor${supplierId}.com`,
                            contact_name: 'Persona de Contacto',
                            email: `proveedor${supplierId}@email.com`,
                            phone: '+1 234 567 8900',
                            address: 'Dirección del Proveedor',
                            created_at: new Date().toISOString(),
                            last_updated: new Date().toISOString(),
                        }
                    };
                }
                if (supplierData.data) {
                    setSupplier(supplierData.data);
                }
                // Fetch navigation info (previous/next suppliers)
                try {
                    const allSuppliersData = await apiRequest('/suppliers?limit=1000');
                    const allSuppliers = allSuppliersData.data || [];
                    const currentIndex = allSuppliers.findIndex((s) => s.id === parseInt(supplierId));
                    if (currentIndex !== -1) {
                        setNavigationInfo({
                            hasPrevious: currentIndex > 0,
                            hasNext: currentIndex < allSuppliers.length - 1,
                            previousId: currentIndex > 0 ? allSuppliers[currentIndex - 1].id : undefined,
                            nextId: currentIndex < allSuppliers.length - 1 ? allSuppliers[currentIndex + 1].id : undefined,
                        });
                    }
                }
                catch (navError) {
                    console.error('Could not fetch navigation info:', navError);
                }
                // Fetch SupplierProduct data with actual pricing information
                try {
                    const supplierProductsData = await apiRequest('/products/supplier-product/');
                    // Filter by current supplier and get product details
                    const supplierProducts = (supplierProductsData || []).filter((sp) => sp.supplier_id === parseInt(supplierId));
                    if (supplierProducts.length === 0) {
                        setProducts([]);
                        return;
                    }
                    // Get product IDs to fetch product details
                    const productIds = supplierProducts.map((sp) => sp.product_id);
                    // Fetch product details for each supplier product
                    const productPromises = productIds.map((productId) => apiRequest(`/products/${productId}`));
                    const productResponses = await Promise.all(productPromises);
                    // Transform the data to include both product and supplier-specific info
                    const transformedProducts = supplierProducts.map((sp, index) => {
                        const productData = productResponses[index];
                        const product = productData?.data;
                        if (!product)
                            return null;
                        return {
                            id: product.id,
                            name: product.name || 'N/A',
                            sku: product.sku || 'N/A',
                            category: categoriesMap[product.category_id] || 'Sin categoría',
                            unit: product.unit || 'N/A',
                            price: sp.cost || 0,
                            stock: sp.stock || 0,
                            lead_time_days: sp.lead_time_days || 0,
                            is_active: sp.is_active !== false,
                            last_updated: sp.last_updated || sp.created_at
                        };
                    }).filter(Boolean);
                    setProducts(transformedProducts);
                }
                catch (productsError) {
                    console.warn('Error fetching supplier products:', productsError);
                    // Fallback to base products if SupplierProduct endpoint fails
                    try {
                        const productsData = await apiRequest(`/products?supplier_id=${supplierId}`);
                        const transformedProducts = (productsData.data || []).map((product) => ({
                            id: product.id,
                            name: product.name,
                            sku: product.sku || product.base_sku || 'N/A',
                            category: categoriesMap[product.category_id] || 'Sin categoría',
                            unit: product.unit || 'N/A',
                            price: product.price || null,
                            stock: product.stock || 0,
                            lead_time_days: null,
                            is_active: product.is_active || false,
                            last_updated: product.last_updated || product.created_at
                        }));
                        setProducts(transformedProducts);
                    }
                    catch (fallbackError) {
                        console.error('Error fetching fallback products:', fallbackError);
                        setProducts([]);
                    }
                }
            }
            catch (err) {
                setError(err.message || 'Unknown error');
            }
            finally {
                setLoading(false);
            }
        };
        if (supplierId)
            fetchData();
    }, [supplierId]);
    const handlePreviousSupplier = () => {
        if (navigationInfo.previousId) {
            navigate(`/supplier-admin/${navigationInfo.previousId}`);
        }
    };
    const handleNextSupplier = () => {
        if (navigationInfo.nextId) {
            navigate(`/supplier-admin/${navigationInfo.nextId}`);
        }
    };
    if (loading) {
        return (_jsx("div", { className: "w-screen min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 overflow-x-hidden", children: _jsxs("div", { className: "container mx-auto max-w-7xl 2xl:max-w-screen-2xl px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 py-4 sm:py-6 lg:py-8", children: [_jsx("div", { className: "mb-4 sm:mb-6", children: _jsx("div", { className: "h-8 sm:h-10 w-20 sm:w-24 bg-gray-200 rounded animate-pulse" }) }), _jsx(Card, { className: "p-4 sm:p-6 md:p-8 mb-6 sm:mb-8", children: _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6", children: Array.from({ length: 6 }).map((_, i) => (_jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "h-3 sm:h-4 w-16 sm:w-20 bg-gray-200 rounded animate-pulse" }), _jsx("div", { className: "h-5 sm:h-6 w-24 sm:w-32 bg-gray-200 rounded animate-pulse" })] }, i))) }) })] }) }));
    }
    if (error) {
        return (_jsx("div", { className: "w-screen min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 overflow-x-hidden", children: _jsxs("div", { className: "container mx-auto max-w-7xl 2xl:max-w-screen-2xl px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 py-4 sm:py-6 lg:py-8", children: [_jsx("div", { className: "mb-4 sm:mb-6", children: _jsxs(Button, { variant: "outline", onClick: () => navigate('/suppliers'), className: "flex items-center space-x-2 border-green-200 text-green-700 hover:bg-green-50 text-sm sm:text-base", children: [_jsx("svg", { className: "w-3 h-3 sm:w-4 sm:h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 19l-7-7 7-7" }) }), _jsx("span", { children: "Volver a Proveedores" })] }) }), _jsxs(Card, { className: "p-6 sm:p-8 text-center", children: [_jsx("div", { className: "w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-red-100 rounded-full flex items-center justify-center", children: _jsx("svg", { className: "w-6 h-6 sm:w-8 sm:h-8 text-red-500", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) }) }), _jsx("h2", { className: "text-lg sm:text-xl font-semibold text-gray-900 mb-2", children: "Error al Cargar Proveedor" }), _jsx("p", { className: "text-sm sm:text-base text-gray-600 mb-4", children: error }), _jsx(Button, { onClick: () => window.location.reload(), className: "bg-green-600 hover:bg-green-700 text-sm sm:text-base", children: "Intentar de Nuevo" })] })] }) }));
    }
    return (_jsx("div", { className: "w-screen min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 overflow-x-hidden", children: _jsxs("div", { className: "container mx-auto max-w-7xl 2xl:max-w-screen-2xl px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 py-4 sm:py-6 lg:py-8", children: [_jsx("div", { className: "mb-4 sm:mb-6", children: _jsxs(Button, { variant: "outline", onClick: () => navigate('/suppliers'), className: "flex items-center space-x-2 border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 text-sm sm:text-base", children: [_jsx("svg", { className: "w-3 h-3 sm:w-4 sm:h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 19l-7-7 7-7" }) }), _jsx("span", { children: "Volver a Proveedores" })] }) }), _jsxs("div", { className: "mb-6 sm:mb-8", children: [_jsx("h1", { className: "text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent mb-2", children: supplier?.name || 'Detalles del Proveedor' }), _jsxs("p", { className: "text-sm sm:text-base text-gray-600 mb-3 sm:mb-4", children: ["ID del Proveedor: ", supplierId] }), _jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0", children: [_jsxs("div", { className: "flex flex-col xs:flex-row items-start xs:items-center gap-2 xs:gap-3", children: [_jsxs(Button, { variant: "outline", onClick: handlePreviousSupplier, disabled: !navigationInfo.hasPrevious, className: "flex items-center space-x-2 border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm w-full xs:w-auto", children: [_jsx("svg", { className: "w-3 h-3 sm:w-4 sm:h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 19l-7-7 7-7" }) }), _jsx("span", { children: "Proveedor Anterior" })] }), _jsxs(Button, { variant: "outline", onClick: handleNextSupplier, disabled: !navigationInfo.hasNext, className: "flex items-center space-x-2 border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm w-full xs:w-auto", children: [_jsx("span", { children: "Siguiente Proveedor" }), _jsx("svg", { className: "w-3 h-3 sm:w-4 sm:h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 5l7 7-7 7" }) })] })] }), _jsx("div", { className: "flex flex-col xs:flex-row gap-2 xs:gap-3", children: _jsx(Button, { variant: "outline", onClick: () => navigate(`/supplier-admin/edit/${supplierId}`), className: "border-green-200 text-green-700 hover:bg-green-50 text-sm w-full xs:w-auto", children: "Editar Proveedor" }) })] })] }), supplier && (_jsxs(_Fragment, { children: [_jsxs(Card, { className: "p-3 sm:p-4 md:p-6 mb-6 sm:mb-8 shadow-lg border-0 rounded-xl", children: [_jsxs("h2", { className: "text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center", children: [_jsx("svg", { className: "w-4 h-4 sm:w-5 sm:h-5 mr-2 text-green-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" }) }), _jsx("span", { className: "text-sm sm:text-lg", children: "Informaci\u00F3n del Proveedor" })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6", children: [_jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-xs sm:text-sm font-medium text-gray-500", children: "Nombre" }), _jsx("p", { className: "text-sm sm:text-lg font-semibold text-gray-900 break-words", children: supplier.name })] }), _jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-xs sm:text-sm font-medium text-gray-500", children: "Nombre Com\u00FAn" }), _jsx("p", { className: "text-xs sm:text-sm text-gray-900", children: supplier.common_name || 'N/A' })] }), _jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-xs sm:text-sm font-medium text-gray-500", children: "Persona de Contacto" }), _jsx("p", { className: "text-xs sm:text-sm text-gray-900", children: supplier.contact_name || 'N/A' })] }), _jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-xs sm:text-sm font-medium text-gray-500", children: "Email" }), _jsx("p", { className: "text-xs sm:text-sm text-gray-900 break-all", children: supplier.email || 'N/A' })] }), _jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-xs sm:text-sm font-medium text-gray-500", children: "Tel\u00E9fono" }), _jsx("p", { className: "text-xs sm:text-sm text-gray-900", children: supplier.phone || 'N/A' })] }), _jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-xs sm:text-sm font-medium text-gray-500", children: "Sitio Web" }), _jsx("p", { className: "text-xs sm:text-sm text-gray-900", children: supplier.website_url ? (_jsx("a", { href: supplier.website_url, target: "_blank", rel: "noopener noreferrer", className: "text-blue-600 hover:text-blue-800 underline break-all", children: supplier.website_url })) : 'N/A' })] }), _jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-xs sm:text-sm font-medium text-gray-500", children: "Direcci\u00F3n" }), _jsx("p", { className: "text-xs sm:text-sm text-gray-900", children: supplier.address || 'N/A' })] }), _jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-xs sm:text-sm font-medium text-gray-500", children: "Creado" }), _jsx("p", { className: "text-xs sm:text-sm text-gray-900", children: new Date(supplier.created_at).toLocaleDateString('es-ES') })] }), _jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-xs sm:text-sm font-medium text-gray-500", children: "\u00DAltima Actualizaci\u00F3n" }), _jsx("p", { className: "text-xs sm:text-sm text-gray-900", children: new Date(supplier.last_updated).toLocaleDateString('es-ES') })] })] }), supplier.description && (_jsx("div", { className: "mt-6 pt-6 border-t border-gray-200", children: _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-xs sm:text-sm font-medium text-gray-500", children: "Descripci\u00F3n" }), _jsx("p", { className: "text-xs sm:text-sm text-gray-900 leading-relaxed", children: supplier.description })] }) }))] }), _jsxs(Card, { className: "shadow-lg border-0 rounded-xl overflow-hidden", children: [_jsxs("div", { className: "bg-gradient-to-r from-gray-50 to-green-50 border-b border-green-100 p-3 sm:p-4 md:p-6", children: [_jsxs("h3", { className: "text-lg sm:text-xl font-semibold text-gray-900 flex items-center", children: [_jsx("svg", { className: "w-4 h-4 sm:w-5 sm:h-5 mr-2 text-green-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-4V8a1 1 0 00-1-1H7a1 1 0 00-1 1v1m0 4h.01" }) }), _jsx("span", { className: "text-sm sm:text-lg", children: "Productos Suministrados" }), _jsxs("span", { className: "ml-2 text-xs sm:text-sm font-normal text-gray-500", children: ["(", products.length, ")"] })] }), products.length > 0 && products[0]?.price !== null && (_jsxs("div", { className: "mt-2 text-xs sm:text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-2", children: [_jsxs("div", { className: "flex items-center", children: [_jsx("svg", { className: "w-4 h-4 mr-1 text-green-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" }) }), _jsx("span", { className: "font-medium", children: "Informaci\u00F3n espec\u00EDfica del proveedor:" })] }), _jsx("p", { className: "mt-1 text-xs", children: "Se muestran precios, stock y tiempos de entrega espec\u00EDficos de este proveedor." })] })), products.length > 0 && products[0]?.price === null && (_jsxs("div", { className: "mt-2 text-xs sm:text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2", children: [_jsxs("div", { className: "flex items-center", children: [_jsx("svg", { className: "w-4 h-4 mr-1 text-amber-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) }), _jsx("span", { className: "font-medium", children: "Informaci\u00F3n de productos base:" })] }), _jsx("p", { className: "mt-1 text-xs", children: "Los precios, stock y tiempos de entrega espec\u00EDficos del proveedor no est\u00E1n disponibles actualmente. Se muestra informaci\u00F3n del cat\u00E1logo base." })] }))] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full border-collapse", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-gray-50/50", children: [_jsx("th", { className: "px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider", children: "Producto" }), _jsx("th", { className: "px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden sm:table-cell", children: "SKU" }), _jsx("th", { className: "px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell", children: "Categor\u00EDa" }), _jsx("th", { className: "px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden lg:table-cell", children: "Unidad" }), _jsx("th", { className: "px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider", children: "Precio" }), _jsx("th", { className: "px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden lg:table-cell", children: "Stock" }), _jsx("th", { className: "px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden xl:table-cell", children: "Tiempo de Entrega" }), _jsx("th", { className: "px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider", children: "Estado" })] }) }), _jsx("tbody", { children: products.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 8, className: "text-center py-8 sm:py-12 text-gray-500", children: _jsxs("div", { className: "flex flex-col items-center justify-center", children: [_jsx("div", { className: "w-10 h-10 sm:w-12 sm:h-12 mb-3 sm:mb-4 bg-gray-100 rounded-full flex items-center justify-center", children: _jsx("svg", { className: "w-5 h-5 sm:w-6 sm:h-6 text-gray-400", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-4V8a1 1 0 00-1-1H7a1 1 0 00-1 1v1m0 4h.01" }) }) }), _jsx("p", { className: "font-medium text-sm sm:text-base", children: "No se encontraron productos" }), _jsx("p", { className: "text-xs sm:text-sm text-gray-400 mt-1", children: "Este proveedor no tiene productos registrados" })] }) }) })) : (products.map((product, index) => (_jsxs("tr", { className: `border-b border-gray-100 hover:bg-gradient-to-r hover:from-green-50/30 hover:to-emerald-50/30 transition-all duration-200 cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`, onClick: () => navigate(`/product-admin/${product.id}`), children: [_jsxs("td", { className: "px-2 sm:px-4 py-3 sm:py-4", children: [_jsx("div", { className: "font-medium text-gray-900 text-sm sm:text-base break-words", children: product.name }), _jsxs("div", { className: "sm:hidden text-xs text-gray-500 mt-1", children: ["SKU: ", product.sku] })] }), _jsx("td", { className: "hidden sm:table-cell px-2 sm:px-4 py-3 sm:py-4", children: _jsx("span", { className: "font-mono text-xs sm:text-sm text-gray-700 bg-gray-100 px-1 sm:px-2 py-1 rounded break-all", children: product.sku }) }), _jsx("td", { className: "hidden md:table-cell px-2 sm:px-4 py-3 sm:py-4", children: _jsx("span", { className: "inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800", children: product.category }) }), _jsx("td", { className: "hidden lg:table-cell px-2 sm:px-4 py-3 sm:py-4", children: _jsx("span", { className: "inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700", children: product.unit }) }), _jsx("td", { className: "px-2 sm:px-4 py-3 sm:py-4", children: _jsx("span", { className: `text-sm sm:text-base ${product.price !== null ? 'font-semibold text-gray-900' : 'text-gray-500'}`, children: product.price !== null ? `$${Number(product.price).toLocaleString()}` : 'N/A' }) }), _jsx("td", { className: "hidden lg:table-cell px-2 sm:px-4 py-3 sm:py-4", children: product.stock !== null && product.stock !== 0 ? (_jsxs("div", { className: "flex items-center", children: [_jsx("span", { className: `text-xs sm:text-sm font-medium ${product.stock > 50 ? 'text-green-600' :
                                                                            product.stock > 10 ? 'text-yellow-600' : 'text-red-600'}`, children: product.stock }), _jsx("span", { className: "text-xs text-gray-500 ml-1", children: "unidades" })] })) : (_jsx("span", { className: "text-gray-500 text-xs sm:text-sm", children: "N/A" })) }), _jsx("td", { className: "hidden xl:table-cell px-2 sm:px-4 py-3 sm:py-4", children: _jsx("span", { className: `text-xs sm:text-sm ${product.lead_time_days !== null ? 'text-gray-900' : 'text-gray-500'}`, children: product.lead_time_days !== null ? `${product.lead_time_days} días` : 'N/A' }) }), _jsx("td", { className: "px-2 sm:px-4 py-3 sm:py-4", children: _jsx("span", { className: `inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${product.is_active
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : product.price !== null
                                                                        ? 'bg-gray-100 text-gray-800'
                                                                        : 'bg-blue-100 text-blue-800'}`, children: product.is_active ? 'Activo' : product.price !== null ? 'Inactivo' : 'En Catálogo' }) })] }, product.id)))) })] }) })] })] }))] }) }));
};
export default SupplierDetailPage;

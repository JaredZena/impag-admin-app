import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProductManagementPage from './components/product/ProductManagementPage';
import ProductDetailPage from './components/product/ProductDetailPage';
import ProductFormPage from './components/product/ProductFormPage';
import SupplierDetailPage from './components/product/SupplierDetailPage';
import SupplierManagementPage from './components/product/SupplierManagementPage';
import SupplierFormPage from './components/product/SupplierFormPage';
import SupplierProductManagementPage from './components/product/SupplierProductManagementPage';
import SupplierProductFormPage from './components/product/SupplierProductFormPage';
import QuotationUploadPage from './components/quotation/QuotationUploadPage';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
export default function App() {
    return (_jsx(AuthProvider, { children: _jsx(BrowserRouter, { children: _jsx(ProtectedRoute, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/product-admin", element: _jsx(ProductManagementPage, {}) }), _jsx(Route, { path: "/product-admin/new", element: _jsx(ProductFormPage, {}) }), _jsx(Route, { path: "/product-admin/edit/:productId", element: _jsx(ProductFormPage, {}) }), _jsx(Route, { path: "/product-admin/:productId", element: _jsx(ProductDetailPage, {}) }), _jsx(Route, { path: "/suppliers", element: _jsx(SupplierManagementPage, {}) }), _jsx(Route, { path: "/supplier-admin/new", element: _jsx(SupplierFormPage, {}) }), _jsx(Route, { path: "/supplier-admin/edit/:supplierId", element: _jsx(SupplierFormPage, {}) }), _jsx(Route, { path: "/supplier-admin/:supplierId", element: _jsx(SupplierDetailPage, {}) }), _jsx(Route, { path: "/supplier-product-admin", element: _jsx(SupplierProductManagementPage, {}) }), _jsx(Route, { path: "/supplier-product-admin/new", element: _jsx(SupplierProductFormPage, {}) }), _jsx(Route, { path: "/supplier-product-admin/edit/:id", element: _jsx(SupplierProductFormPage, {}) }), _jsx(Route, { path: "/quotation-upload", element: _jsx(QuotationUploadPage, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/product-admin", replace: true }) })] }) }) }) }));
}

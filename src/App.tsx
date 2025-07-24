import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProductManagementPage from './components/product/ProductManagementPage';
import ProductDetailPage from './components/product/ProductDetailPage';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ProtectedRoute>
          <Routes>
            <Route path="/product-admin" element={<ProductManagementPage />} />
            <Route path="/product-admin/:productId" element={<ProductDetailPage />} />
            <Route path="*" element={<Navigate to="/product-admin" replace />} />
          </Routes>
        </ProtectedRoute>
      </BrowserRouter>
    </AuthProvider>
  );
}
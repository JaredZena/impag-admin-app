import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProductManagementPage from './components/product/ProductManagementPage';
import ProductDetailPage from './components/product/ProductDetailPage';
import ProductFormPage from './components/product/ProductFormPage';
import StockManagementPage from './components/product/StockManagementPage';
import SupplierDetailPage from './components/product/SupplierDetailPage';
import SupplierManagementPage from './components/product/SupplierManagementPage';
import SupplierFormPage from './components/product/SupplierFormPage';
import SupplierProductManagementPage from './components/product/SupplierProductManagementPage';
import SupplierProductFormPage from './components/product/SupplierProductFormPage';
import KitManagementPage from './components/product/KitManagementPage';
import ProductBalancePage from './components/product/ProductBalancePage';
import QuotationUploadPage from './components/quotation/QuotationUploadPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import SessionExpiredDialog from './components/auth/SessionExpiredDialog';
import { NotificationProvider, useNotifications } from './components/ui/notification';
import { setSessionExpirationHandler } from './utils/api';

const AppContent: React.FC = () => {
  const { sessionExpired, forceReauthenticate, clearSessionExpired, reauthenticate } = useAuth();
  const { addNotification } = useNotifications();

  useEffect(() => {
    // Set up the session expiration handler for API calls
    setSessionExpirationHandler(() => {
      console.log('Session expiration triggered from API');
      forceReauthenticate();
      addNotification({
        type: 'warning',
        title: 'Sesión Expirada',
        message: 'Tu sesión ha expirado. Por favor, autentícate nuevamente para continuar.',
        duration: 8000,
      });
    });
  }, [forceReauthenticate, addNotification]);

  const handleReauthenticate = async () => {
    try {
      await reauthenticate();
      addNotification({
        type: 'success',
        title: 'Sesión Renovada',
        message: 'Tu sesión ha sido renovada exitosamente.',
        duration: 5000,
      });
    } catch (error) {
      console.error('Reauthentication failed:', error);
      addNotification({
        type: 'error',
        title: 'Error de Autenticación',
        message: 'No se pudo renovar la sesión. Por favor, recarga la página.',
        duration: 8000,
      });
      // Fallback to reload if reauthentication fails
      setTimeout(() => window.location.reload(), 2000);
    }
  };

  const handleCloseSessionDialog = () => {
    clearSessionExpired();
  };

  return (
    <>
      <ProtectedRoute>
        <Routes>
          <Route path="/product-admin" element={<ProductManagementPage />} />
          <Route path="/product-admin/new" element={<ProductFormPage />} />
          <Route path="/product-admin/edit/:productId" element={<ProductFormPage />} />
          <Route path="/product-admin/:productId" element={<ProductDetailPage />} />
          <Route path="/suppliers" element={<SupplierManagementPage />} />
          <Route path="/supplier-admin/new" element={<SupplierFormPage />} />
          <Route path="/supplier-admin/edit/:supplierId" element={<SupplierFormPage />} />
          <Route path="/supplier-admin/:supplierId" element={<SupplierDetailPage />} />
          <Route path="/stock" element={<StockManagementPage />} />
          <Route path="/supplier-product-admin" element={<SupplierProductManagementPage />} />
          <Route path="/supplier-product-admin/new" element={<SupplierProductFormPage />} />
          <Route path="/supplier-product-admin/edit/:id" element={<SupplierProductFormPage />} />
          <Route path="/kits" element={<KitManagementPage />} />
          <Route path="/balance" element={<ProductBalancePage />} />
          <Route path="/quotation-upload" element={<QuotationUploadPage />} />
          <Route path="*" element={<Navigate to="/product-admin" replace />} />
        </Routes>
      </ProtectedRoute>

      <SessionExpiredDialog
        isOpen={sessionExpired}
        onReauthenticate={handleReauthenticate}
        onClose={handleCloseSessionDialog}
      />
    </>
  );
};

export default function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </NotificationProvider>
  );
}
import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProductDetailPage from './components/product/ProductDetailPage';
import ProductFormPage from './components/product/ProductFormPage';
import ProductManagementPage from './components/product/ProductManagementPage';
import StockManagementPage from './components/product/StockManagementPage';
import SupplierDetailPage from './components/product/SupplierDetailPage';
import SupplierManagementPage from './components/product/SupplierManagementPage';
import SupplierFormPage from './components/product/SupplierFormPage';
import SupplierProductManagementPage from './components/product/SupplierProductManagementPage';
import SupplierProductFormPage from './components/product/SupplierProductFormPage';
import TasksPage from './components/tasks/TasksPage';
import TaskArchivePage from './components/tasks/TaskArchivePage';
import QuotesPage from './components/quotes/QuotesPage';
import QuoteForm from './components/quotes/QuoteForm';
import QuoteDetailPage from './components/quotes/QuoteDetailPage';
import CustomersPage from './components/customers/CustomersPage';
import CustomerDetailPage from './components/customers/CustomerDetailPage';
import PosPage from './components/pos/PosPage';
import CajaPage from './components/pos/CajaPage';
import ToolsPage from './components/tools/ToolsPage';
import ToolFormPage from './components/tools/ToolFormPage';
import ToolDetailPage from './components/tools/ToolDetailPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import SessionExpiredDialog from './components/auth/SessionExpiredDialog';
import { NotificationProvider, useNotifications } from './components/ui/notification';
import { setSessionExpirationHandler } from './utils/api';

// Heavy or rarely used pages load on demand so phones download less on first open.
const ProductBalancePage = lazy(() => import('./components/product/ProductBalancePage'));
const QuotationUploadPage = lazy(() => import('./components/quotation/QuotationUploadPage'));
const QuotationChatPage = lazy(() => import('./components/quotation/QuotationChatPage'));
const QuotationHistoryPage = lazy(() => import('./components/quotation/QuotationHistoryPage'));
const SocialCalendarPage = lazy(() => import('./components/social-calendar/SocialCalendarPage'));
const TikTokPage = lazy(() => import('./components/tiktok/TikTokPage'));
const FilesPage = lazy(() => import('./components/files/FilesPage'));
const WhatsAppQueuePage = lazy(() => import('./components/whatsapp/WhatsAppQueuePage'));
const RoadmapPage = lazy(() => import('./components/roadmap/RoadmapPage'));
const CampaignsPage = lazy(() => import('./components/campaigns/CampaignsPage'));
const CampaignDetailPage = lazy(() => import('./components/campaigns/CampaignDetailPage'));
const SalesDashboardPage = lazy(() => import('./components/sales/SalesDashboardPage'));

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
        <Suspense fallback={<div className="py-16 text-center text-sm text-gray-500">Cargando…</div>}>
        <Routes>
          <Route path="/product-admin" element={<ProductManagementPage />} />
          <Route path="/product-admin/new" element={<ProductFormPage />} />
          <Route path="/product-admin/edit/:productId" element={<ProductFormPage />} />
          <Route path="/product-admin/:productId" element={<ProductDetailPage />} />
          <Route path="/suppliers" element={<SupplierManagementPage />} />
          <Route path="/supplier-admin/new" element={<SupplierFormPage />} />
          <Route path="/supplier-admin/edit/:supplierId" element={<SupplierFormPage />} />
          <Route path="/supplier-admin/:supplierId" element={<SupplierDetailPage />} />
          <Route path="/supplier-products" element={<SupplierProductManagementPage />} />
          <Route path="/supplier-products/new" element={<SupplierProductFormPage />} />
          <Route path="/supplier-products/edit/:id" element={<SupplierProductFormPage />} />
          <Route path="/stock" element={<StockManagementPage />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/tools/new" element={<ToolFormPage />} />
          <Route path="/tools/:id" element={<ToolDetailPage />} />
          <Route path="/balance" element={<ProductBalancePage />} />
          <Route path="/balance" element={<ProductBalancePage />} />
          <Route path="/balance/:balanceId" element={<ProductBalancePage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/tasks/archive" element={<TaskArchivePage />} />
          <Route path="/quotes" element={<QuotesPage />} />
          <Route path="/quotes/new" element={<QuoteForm />} />
          <Route path="/quotes/:id" element={<QuoteDetailPage />} />
          <Route path="/sales" element={<SalesDashboardPage />} />
          <Route path="/pos" element={<PosPage />} />
          <Route path="/caja" element={<CajaPage />} />
          <Route path="/social-calendar" element={<SocialCalendarPage />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
          <Route path="/tiktok" element={<TikTokPage />} />
          <Route path="/quotation-upload" element={<QuotationUploadPage />} />
          <Route path="/quotation-chat" element={<QuotationChatPage />} />
          <Route path="/quotation-history/:id?" element={<QuotationHistoryPage />} />
          <Route path="/files" element={<FilesPage />} />
          <Route path="/whatsapp" element={<WhatsAppQueuePage />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />
          <Route path="*" element={<Navigate to="/tasks" replace />} />
        </Routes>
        </Suspense>
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
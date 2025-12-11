import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Login from './Login';
import MainLayout from '../layout/MainLayout';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400 text-lg">Loading IMPAG Admin...</p>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Login />;
  }

  // Authenticated: Wrap in MainLayout
  return (
    <MainLayout>
      {children}
    </MainLayout>
  );
};

export default ProtectedRoute; 
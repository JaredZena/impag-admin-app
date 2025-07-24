import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Login from './Login';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading, logout } = useAuth();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600 text-lg">Loading IMPAG Admin...</p>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Login />;
  }

  // Authenticated: show user indicator and children
  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm">
          {user.picture && (
            <img
              src={user.picture}
              alt={user.name}
              className="w-6 h-6 rounded-full"
            />
          )}
          <span className="text-sm text-gray-700">{user.name}</span>
          <button
            onClick={logout}
            className="text-xs text-gray-500 hover:text-red-600"
          >
            Logout
          </button>
        </div>
      </div>
      {children}
    </>
  );
};

export default ProtectedRoute; 
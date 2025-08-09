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
      <div className="fixed top-2 sm:top-4 right-2 sm:right-4 z-50">
        <div className="flex items-center gap-1 sm:gap-2 bg-white border rounded-lg px-2 sm:px-3 py-1 sm:py-2 shadow-sm">
          {user.picture && (
            <img
              src={user.picture}
              alt={user.name}
              className="w-4 h-4 sm:w-6 sm:h-6 rounded-full"
            />
          )}
          <span className="text-xs sm:text-sm text-gray-700 hidden sm:inline">{user.name}</span>
          <span className="text-xs text-gray-700 sm:hidden">{user.name.split(' ')[0]}</span>
          <button
            onClick={logout}
            className="text-xs text-gray-500 hover:text-red-600 px-1 sm:px-2"
          >
            <span className="hidden sm:inline">Logout</span>
            <span className="sm:hidden">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </span>
          </button>
        </div>
      </div>
      {children}
    </>
  );
};

export default ProtectedRoute; 
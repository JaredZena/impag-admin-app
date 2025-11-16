import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './button';

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    {
      path: '/supplier-products',
      label: 'Productos',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-4V8a1 1 0 00-1-1H7a1 1 0 00-1 1v1m0 4h.01" />
        </svg>
      ),
    },
    {
      path: '/suppliers',
      label: 'Proveedores',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      path: '/quotation-upload',
      label: 'Cargar Productos',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
    },
    {
      path: '/quotation-chat',
      label: 'Cotizaciones',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
    },
    {
      path: '/stock',
      label: 'Inventario',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      path: '/balance',
      label: 'Balance',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
  ];

  const isActive = (path: string) => {
    if (path === '/supplier-products') {
      return location.pathname === '/supplier-products' || 
             location.pathname.startsWith('/supplier-products') ||
             location.pathname.startsWith('/product-admin');
    }
    if (path === '/suppliers') {
      return location.pathname === '/suppliers' || location.pathname.startsWith('/supplier-admin');
    }
    return location.pathname === path || location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40 bg-white/95 backdrop-blur-md border border-gray-200/50 rounded-2xl shadow-lg px-3 py-2 transition-all duration-300 hover:shadow-xl">
      <div className="flex items-center space-x-1">
        {navigationItems.map((item) => (
          <Button
            key={item.path}
            variant={isActive(item.path) ? 'default' : 'ghost'}
            size="sm"
            onClick={() => navigate(item.path)}
            className={`flex items-center space-x-2 text-xs transition-all duration-200 ${
              isActive(item.path)
                ? 'bg-blue-600 text-white shadow-sm transform scale-105'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 hover:transform hover:scale-105'
            }`}
            aria-label={item.label}
          >
            {item.icon}
            <span className="hidden sm:inline font-medium">{item.label}</span>
          </Button>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;

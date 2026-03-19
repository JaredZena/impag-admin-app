import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationBell from '@/components/quotes/NotificationBell';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar-collapsed');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const isFullBleedPage = location.pathname.startsWith('/social-calendar') || location.pathname.startsWith('/tasks') || location.pathname.startsWith('/tiktok');

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors relative">
      <Sidebar 
        isCollapsed={isCollapsed} 
        toggleCollapse={() => setIsCollapsed(!isCollapsed)} 
      />
      
      {/* Top bar with notification bell */}
      <div className={`fixed top-0 right-0 z-40 h-16 flex items-center pr-6 transition-all duration-300 ${isCollapsed ? 'left-0 md:left-20' : 'left-0 md:left-64'}`}>
        <div className="ml-auto">
          <NotificationBell />
        </div>
      </div>

      <main
        className={`
          transition-all duration-300 ease-in-out min-h-screen
          ml-0
          ${isCollapsed ? 'md:ml-20' : 'md:ml-64'}
        `}
      >
        <div className={`
          ${isFullBleedPage ? 'p-0 pt-0' : 'p-4 sm:p-6 lg:p-8 pt-16 md:pt-8'}
          animate-fade-in
        `}>
           {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;

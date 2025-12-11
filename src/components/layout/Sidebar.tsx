import React, { useState } from 'react';
import { 
  Package, 
  Users, 
  UploadCloud, 
  FileText, 
  ClipboardList, 
  Calendar,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  className?: string;
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ className = '', isCollapsed, toggleCollapse }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navigationItems = [
    { path: '/supplier-products', label: 'Productos', icon: <Package size={20} /> },
    { path: '/suppliers', label: 'Proveedores', icon: <Users size={20} /> },
    { path: '/quotation-upload', label: 'Cargar Productos', icon: <UploadCloud size={20} /> },
    { path: '/quotation-history', label: 'Cotizaciones', icon: <FileText size={20} /> },
    { path: '/stock', label: 'Inventario', icon: <ClipboardList size={20} /> },
    { path: '/social-calendar', label: 'Calendario Social', icon: <Calendar size={20} /> },
  ];

  const isActive = (path: string) => {
     if (path === '/quotation-history') {
       return location.pathname === '/quotation-history' || location.pathname === '/quotation-chat';
     }
     return location.pathname === path || location.pathname.startsWith(path);
  };

  const toggleMobile = () => setIsMobileOpen(!isMobileOpen);

  return (
    <>
      {/* Mobile Toggle Button (Floating) */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <button 
          onClick={toggleMobile}
          className="p-2 bg-slate-900 text-white rounded-lg shadow-lg border border-slate-700"
        >
          {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Backdrop for mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed top-0 left-0 h-full bg-slate-900 border-r border-slate-800 z-50
        transition-all duration-300 ease-in-out flex flex-col
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${isCollapsed ? 'w-20' : 'w-64'}
        ${className}
      `}>
        
        {/* Header / Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 shrink-0">
          {!isCollapsed && (
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent truncate">
              IMPAG Admin
            </span>
          )}
          {isCollapsed && <span className="font-bold text-blue-400 text-2xl mx-auto">I</span>}
          
          <button 
            onClick={toggleCollapse}
            className="hidden md:flex p-1.5 bg-slate-800/70 border border-slate-700/80 rounded-md text-slate-100 hover:bg-slate-800 hover:text-white transition-colors shadow-sm"
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-6 overflow-y-auto overflow-x-hidden">
          <nav className="space-y-1 px-3">
            {navigationItems.map((item) => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setIsMobileOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative border
                    ${active 
                      ? '!bg-blue-600/25 !border-blue-400/50 !text-blue-50 font-semibold shadow-[0_0_18px_rgba(59,130,246,0.25)]' 
                      : '!bg-slate-800/60 !border-slate-700/80 !text-slate-100 hover:!bg-slate-800 hover:!text-white hover:!border-slate-500/70 font-medium'}
                  `}
                  title={isCollapsed ? item.label : ''}
                >
                  <span className={`shrink-0 ${active ? '!text-blue-50' : '!text-slate-100 group-hover:!text-white'}`}>
                    {item.icon}
                  </span>
                  
                  {!isCollapsed && (
                    <span className="font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis">
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 shrink-0">
           <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
             <img 
               src={user?.picture || 'https://via.placeholder.com/40'} 
               alt={user?.name} 
               className="w-9 h-9 rounded-full border border-slate-700 shrink-0"
             />
             
             {!isCollapsed && (
               <div className="flex-1 min-w-0">
                 <p className="text-sm font-medium text-slate-200 truncate">{user?.name}</p>
                <button 
                  onClick={logout}
                  className="flex items-center gap-1.5 text-xs text-slate-100 hover:text-red-300 mt-0.5 transition-colors px-2 py-1 rounded-md bg-slate-800/60 border border-slate-700/80 hover:bg-slate-800"
                >
                   <LogOut size={12} />
                   <span>Cerrar Sesión</span>
                 </button>
               </div>
             )}
           </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;

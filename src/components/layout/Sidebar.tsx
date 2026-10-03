import React, { useState } from 'react';
import {
  Package,
  Users,
  ClipboardList,
  Calendar,
  CheckSquare,
  FolderOpen,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
  Music,
  FileBarChart,
  MessageCircle,
  Map as MapIcon,
  UserCircle,
  Megaphone,
  Tag,
  TrendingUp,
  ShoppingCart,
  Wallet,
  Wrench,
  Scale,
  ChevronDown,
  MoreHorizontal,
  Search,
  Sun
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  className?: string;
  isCollapsed: boolean;
  toggleCollapse: () => void;
  // Phone drawer, opened from "Más" in the bottom tab bar
  isMobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ className = '', isCollapsed, toggleCollapse, isMobileOpen, setMobileOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  type NavItem = { path: string; label: string; icon: React.ReactNode };

  // Plan de adopción (Obsidian «IMPAG App Adoption Plan»): seis entradas para
  // el equipo — Hoy, Pendientes, Clientes, Cotizaciones, Ventas, Catálogo.
  // Lo demás (casi sin uso en prod a oct 2026) vive en "Más", cerrado.
  const navigationItems: NavItem[] = [
    { path: '/hoy', label: 'Hoy', icon: <Sun size={20} /> },
    { path: '/consulta', label: 'Consulta', icon: <Search size={20} /> },
    { path: '/tasks', label: 'Pendientes', icon: <CheckSquare size={20} /> },
    { path: '/quotes', label: 'Cotizaciones', icon: <FileBarChart size={20} /> },
    { path: '/sales', label: 'Ventas', icon: <TrendingUp size={20} /> },
    { path: '/customers', label: 'Clientes', icon: <UserCircle size={20} /> },
  ];

  const navigationGroups: { key: string; label: string; icon: React.ReactNode; items: NavItem[] }[] = [
    {
      key: 'catalogo',
      label: 'Catálogo',
      icon: <Package size={20} />,
      items: [
        { path: '/product-admin', label: 'Precios de venta', icon: <Tag size={20} /> },
        { path: '/stock', label: 'Stock', icon: <ClipboardList size={20} /> },
        { path: '/supplier-products', label: 'Costos de proveedor', icon: <Package size={20} /> },
        { path: '/suppliers', label: 'Proveedores', icon: <Users size={20} /> },
        { path: '/tools', label: 'Herramientas', icon: <Wrench size={20} /> },
      ],
    },
    {
      key: 'mas',
      label: 'Más',
      icon: <MoreHorizontal size={20} />,
      items: [
        { path: '/punto-equilibrio', label: 'Punto de equilibrio', icon: <Scale size={20} /> },
        { path: '/files', label: 'Archivos', icon: <FolderOpen size={20} /> },
        { path: '/pos', label: 'Punto de Venta', icon: <ShoppingCart size={20} /> },
        { path: '/caja', label: 'Caja', icon: <Wallet size={20} /> },
        { path: '/whatsapp', label: 'WhatsApp', icon: <MessageCircle size={20} /> },
        { path: '/social-calendar', label: 'Calendario Social', icon: <Calendar size={20} /> },
        { path: '/campaigns', label: 'Campañas', icon: <Megaphone size={20} /> },
        { path: '/tiktok', label: 'TikTok', icon: <Music size={20} /> },
        { path: '/roadmap', label: 'Plan de la app', icon: <MapIcon size={20} /> },
      ],
    },
  ];

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('sidebar_open_groups') || '{}');
    } catch {
      return {};
    }
  });
  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('sidebar_open_groups', JSON.stringify(next));
      } catch {
        /* sin storage: sólo en memoria */
      }
      return next;
    });

  const isActive = (path: string) => {
     // El Cotizador IA (/quotation-history, /quotation-chat) vive dentro de Cotizaciones.
     if (path === '/quotes') {
       return ['/quotes', '/quotation-history', '/quotation-chat'].some((p) => location.pathname.startsWith(p));
     }
     return location.pathname === path || location.pathname.startsWith(path);
  };


  const renderItem = (item: NavItem) => {
    const active = isActive(item.path);
    return (
      <button
        key={item.path}
        onClick={() => {
          navigate(item.path);
          setMobileOpen(false);
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
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
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
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
            className="md:hidden p-2 !bg-transparent !border-0 text-slate-300 hover:text-white"
          >
            <X size={24} />
          </button>
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
            {navigationItems.map(renderItem)}
            {navigationGroups.map((group) => {
              const hasActive = group.items.some((item) => isActive(item.path));
              // Catálogo starts open: Precios de venta is Hernán's most used screen.
              const open = openGroups[group.key] ?? (hasActive || group.key === 'catalogo');
              return (
                <div key={group.key} className="pt-2">
                  <button
                    onClick={() => toggleGroup(group.key)}
                    aria-expanded={open}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl !bg-transparent !border-transparent !text-slate-400 hover:!text-white text-xs font-semibold uppercase tracking-wider"
                    title={isCollapsed ? group.label : ''}
                  >
                    <span className="shrink-0">{group.icon}</span>
                    {!isCollapsed && <span className="flex-1 text-left">{group.label}</span>}
                    {!isCollapsed && (
                      <ChevronDown size={14} className={`transition-transform ${open ? '' : '-rotate-90'}`} />
                    )}
                  </button>
                  {open && <div className="space-y-1 mt-1">{group.items.map(renderItem)}</div>}
                </div>
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

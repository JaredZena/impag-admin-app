import { useLocation, useNavigate } from 'react-router-dom';
import { CheckSquare, FileBarChart, MoreHorizontal, Search, Sun } from 'lucide-react';

// Phone navigation like WhatsApp's: the four daily screens always one tap
// away at the bottom, everything else behind "Más" (the full menu).
const TABS = [
  { path: '/hoy', label: 'Hoy', icon: Sun },
  { path: '/consulta', label: 'Consulta', icon: Search },
  { path: '/tasks', label: 'Pendientes', icon: CheckSquare },
  { path: '/quotes', label: 'Cotizaciones', icon: FileBarChart },
];

export default function MobileTabBar({ onMore, moreOpen }: { onMore: () => void; moreOpen: boolean }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onTab = TABS.some((t) => pathname.startsWith(t.path));

  const item = (active: boolean) =>
    `flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] text-[11px] font-medium ${
      active ? 'text-green-700' : 'text-gray-500'
    }`;

  return (
    <nav
      aria-label="Navegación principal"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 flex pb-[env(safe-area-inset-bottom)]"
    >
      {TABS.map(({ path, label, icon: Icon }) => {
        const active = pathname.startsWith(path);
        return (
          <button
            key={path}
            type="button"
            onClick={() => navigate(path)}
            aria-current={active ? 'page' : undefined}
            className={`${item(active)} !bg-transparent !p-0 !border-0 !rounded-none`}
          >
            <Icon size={22} strokeWidth={active ? 2.4 : 2} />
            {label}
          </button>
        );
      })}
      <button
        type="button"
        onClick={onMore}
        aria-expanded={moreOpen}
        className={`${item(moreOpen || !onTab)} !bg-transparent !p-0 !border-0 !rounded-none`}
      >
        <MoreHorizontal size={22} />
        Más
      </button>
    </nav>
  );
}

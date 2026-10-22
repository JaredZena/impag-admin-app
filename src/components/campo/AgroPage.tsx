import { useSearchParams } from 'react-router-dom';
import { Gauge, Settings, Sprout, Users } from 'lucide-react';
import AgroResumenTab from './agro/AgroResumenTab';
import AgroLeadsTab from './agro/AgroLeadsTab';
import AgroConfigTab from './agro/AgroConfigTab';

type Tab = 'resumen' | 'leads' | 'configuracion';

const TABS: { value: Tab; label: string; icon: typeof Gauge }[] = [
  { value: 'resumen', label: 'Resumen', icon: Gauge },
  { value: 'leads', label: 'Leads', icon: Users },
  { value: 'configuracion', label: 'Configuración', icon: Settings },
];

export default function AgroPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'resumen';

  const setTab = (value: Tab) => {
    const next = new URLSearchParams(params);
    if (value === 'resumen') next.delete('tab');
    else next.set('tab', value);
    setParams(next, { replace: true });
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <Sprout size={22} className="text-green-600" aria-hidden="true" />
        <h1 className="text-xl font-bold text-gray-900">Agroproyectos</h1>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        Proyectos agropecuarios diseñados con IA en todoparaelcampo.com.mx/agroproyectos.
      </p>

      <div className="flex gap-1 border-b border-gray-200 mb-5 overflow-x-auto" role="tablist">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.value;
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.value)}
              className={`inline-flex shrink-0 items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <Icon size={15} aria-hidden="true" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'resumen' && <AgroResumenTab />}
      {tab === 'leads' && <AgroLeadsTab />}
      {tab === 'configuracion' && <AgroConfigTab />}
    </div>
  );
}

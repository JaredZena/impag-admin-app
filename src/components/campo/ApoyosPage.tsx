import { useSearchParams } from 'react-router-dom';
import ApoyosReviewTab from './apoyos/ApoyosReviewTab';
import ApoyosRunsTab from './apoyos/ApoyosRunsTab';
import ApoyosSettingsTab from './apoyos/ApoyosSettingsTab';

type Tab = 'revision' | 'ejecuciones' | 'configuracion';

const TABS: { value: Tab; label: string }[] = [
  { value: 'revision', label: 'Revisión' },
  { value: 'ejecuciones', label: 'Ejecuciones' },
  { value: 'configuracion', label: 'Configuración' },
];

export default function ApoyosPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: Tab = TABS.some((t) => t.value === tabParam) ? (tabParam as Tab) : 'revision';

  const setTab = (value: Tab) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'revision') next.delete('tab');
    else next.set('tab', value);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Apoyos gubernamentales</h1>
        <p className="hidden sm:block text-sm text-gray-500 mt-1">
          Programas de gobierno para productores — encontrados con IA, revisados a mano antes de publicarse.
        </p>
      </div>

      <div role="tablist" aria-label="Secciones de Apoyos" className="flex gap-1 border-b border-gray-200 mb-5 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
            className={`shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.value
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'revision' && <ApoyosReviewTab />}
      {tab === 'ejecuciones' && <ApoyosRunsTab />}
      {tab === 'configuracion' && <ApoyosSettingsTab />}
    </div>
  );
}

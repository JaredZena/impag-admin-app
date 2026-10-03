import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, FileText, Search, ShoppingBag } from 'lucide-react';
import { getPipelineSummary } from '@/utils/quotesApi';
import type { QuotePipelineSummary } from '@/types/quotes';
import { money, type HoyData } from '@/utils/hoyText';

// Lo que se hace todos los días, a un toque desde Hoy. Cada botón abre la
// pantalla con su ventana de "pegar" ya abierta.
const ACCIONES = [
  { to: '/sales?capture=1', label: 'Registrar venta', hint: 'Pega el mensaje *Venta*', icon: ShoppingBag, primary: true },
  { to: '/quotes?capture=1', label: 'Registrar cotización', hint: 'Pega *Cotización Enviada* o el PDF', icon: FileText, primary: true },
  { to: '/tasks?pegar=1', label: 'Pegar pendientes', hint: 'La lista *PENDIENTES*', icon: ClipboardList, primary: false },
  { to: '/consulta', label: 'Buscar precio o stock', hint: 'Producto, cliente o folio', icon: Search, primary: false },
];

function Cifra({ label, value, sub, to }: { label: string; value: string; sub?: string; to: string }) {
  return (
    <Link to={to} className="block bg-white border border-gray-100 rounded-xl px-4 py-3 hover:border-gray-300">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-900 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </Link>
  );
}

export default function HoyAcciones({ data, isToday }: { data: HoyData | null; isToday: boolean }) {
  const [pipeline, setPipeline] = useState<QuotePipelineSummary | null>(null);

  useEffect(() => {
    getPipelineSummary()
      .then(setPipeline)
      .catch(() => setPipeline(null));
  }, []);

  const vendido = data ? data.sales.reduce((sum, s) => sum + (s.amount || 0), 0) : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {ACCIONES.map(({ to, label, hint, icon: Icon, primary }) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-3 min-h-[64px] rounded-xl px-4 py-3 border ${
              primary
                ? 'bg-green-600 border-green-600 text-white hover:bg-green-700'
                : 'bg-white border-gray-200 text-gray-900 hover:border-gray-400'
            }`}
          >
            <Icon size={22} className="shrink-0" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-tight">{label}</span>
              <span className={`hidden sm:block text-xs ${primary ? 'text-green-100' : 'text-gray-500'}`}>{hint}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Cifra
          label={isToday ? 'Vendido hoy' : 'Vendido ese día'}
          value={vendido == null ? '—' : money(vendido)}
          sub={data ? `${data.sales.length} venta${data.sales.length === 1 ? '' : 's'} registrada${data.sales.length === 1 ? '' : 's'}` : undefined}
          to="/sales"
        />
        <Cifra
          label="Nos deben"
          value={data ? money(data.receivable.total) : '—'}
          sub={data ? `${data.receivable.rows.length} cliente${data.receivable.rows.length === 1 ? '' : 's'}` : undefined}
          to="/consulta"
        />
        <div className="col-span-2 lg:col-span-1">
          <Cifra
            label="Cotizaciones abiertas"
            value={pipeline ? money(pipeline.open_total) : '—'}
            sub={pipeline ? `${pipeline.open_count} cotizaciones` : undefined}
            to="/quotes"
          />
        </div>
      </div>
    </div>
  );
}

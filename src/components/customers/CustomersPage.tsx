import { useEffect, useState, useCallback } from 'react';
import { apiRequest } from '@/utils/api';
import MainLayout from '@/components/layout/MainLayout';

interface CustomerBrief {
  id: number;
  display_name: string | null;
  phone_e164: string | null;
  location: string | null;
  source: string | null;
  has_purchased: boolean;
  last_activity_at: string | null;
}

interface Customer360 {
  customer: CustomerBrief & { email: string | null; rfc: string | null; first_seen_at: string | null };
  conversations: { id: number; customer_phone: string; message_count: number; last_message_at: string | null }[];
  quotes: { id: number; quote_number: string; status: string; created_at: string | null }[];
  documents: { id: number; filename: string; category: string; document_date: string | null }[];
}

const SOURCE_CLS: Record<string, string> = {
  whatsapp: 'text-green-700 bg-green-50', visita: 'text-blue-700 bg-blue-50',
  marketplace: 'text-purple-700 bg-purple-50', messenger: 'text-sky-700 bg-sky-50',
};

export default function CustomersPage() {
  const [q, setQ] = useState('');
  const [list, setList] = useState<CustomerBrief[]>([]);
  const [selected, setSelected] = useState<Customer360 | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    try {
      setList(await apiRequest(`/customers?q=${encodeURIComponent(query)}&limit=100`) || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(''); }, [load]);
  useEffect(() => {
    const t = setTimeout(() => load(q), 250);  // debounce
    return () => clearTimeout(t);
  }, [q, load]);

  const open = async (id: number) => {
    try { setSelected(await apiRequest(`/customers/${id}`)); }
    catch (e) { console.error(e); }
  };

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        <h1 className="text-xl font-bold text-gray-800 mb-1">Clientes</h1>
        <p className="text-sm text-gray-500 mb-4">Busca por nombre, teléfono o lugar — un cliente, todo su historial.</p>
        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="Buscar cliente…"
          className="w-full mb-4 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* List */}
          <div className="space-y-1.5 max-h-[70vh] overflow-y-auto">
            {loading ? <p className="text-gray-400 text-sm">Cargando…</p>
              : list.length === 0 ? <p className="text-gray-400 text-sm">Sin resultados.</p>
              : list.map(c => (
                <button key={c.id} onClick={() => open(c.id)}
                  className={`w-full text-left rounded-lg border p-2.5 transition-colors ${
                    selected?.customer.id === c.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-800">{c.display_name || '(sin nombre)'}</span>
                    <div className="flex items-center gap-1.5">
                      {c.has_purchased && <span className="text-[9px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded">compró</span>}
                      {c.source && <span className={`text-[9px] px-1.5 py-0.5 rounded ${SOURCE_CLS[c.source] || 'text-gray-500 bg-gray-50'}`}>{c.source}</span>}
                    </div>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{c.phone_e164}{c.location ? ` · ${c.location}` : ''}</div>
                </button>
              ))}
          </div>

          {/* 360 detail */}
          <div className="rounded-lg border border-gray-200 p-4 max-h-[70vh] overflow-y-auto">
            {!selected ? <p className="text-gray-400 text-sm">Selecciona un cliente para ver su 360.</p> : (
              <>
                <h2 className="font-semibold text-gray-800">{selected.customer.display_name || '(sin nombre)'}</h2>
                <div className="text-xs text-gray-500 mt-0.5">
                  {selected.customer.phone_e164}{selected.customer.location ? ` · ${selected.customer.location}` : ''}
                  {selected.customer.email ? ` · ${selected.customer.email}` : ''}
                </div>

                <Section title={`Conversaciones de WhatsApp (${selected.conversations.length})`}>
                  {selected.conversations.map(cv => (
                    <Row key={cv.id} left={cv.customer_phone} right={`${cv.message_count} msgs`} />
                  ))}
                </Section>

                <Section title={`Cotizaciones rastreables (${selected.quotes.length})`}>
                  {selected.quotes.map(qq => (
                    <Row key={qq.id} left={qq.quote_number} right={qq.status} />
                  ))}
                </Section>

                <Section title={`Documentos (${selected.documents.length})`}>
                  {selected.documents.map(d => (
                    <Row key={d.id} left={d.filename} right={d.category} />
                  ))}
                </Section>
              </>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const empty = !children || (Array.isArray(children) && children.length === 0);
  return (
    <div className="mt-4">
      <h3 className="text-[11px] font-semibold text-gray-500 uppercase mb-1">{title}</h3>
      {empty ? <p className="text-[11px] text-gray-300">—</p> : <div className="space-y-1">{children}</div>}
    </div>
  );
}

function Row({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1">
      <span className="text-gray-700 truncate mr-2">{left}</span>
      <span className="text-gray-400 shrink-0">{right}</span>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/utils/api';
import MainLayout from '@/components/layout/MainLayout';

interface RoadmapItem {
  id: number;
  phase: number;
  title: string;
  description: string | null;
  need: string | null;
  effort: string | null;
  impact: string | null;
  status: 'planned' | 'in_progress' | 'done' | 'deferred';
  notes: string | null;
}

const PHASE_LABELS: Record<number, string> = {
  0: '✅ Ya construido',
  1: 'Fase 1 — Fundación',
  2: 'Fase 2 — Rebanadas de valor (sem. 1-6)',
  3: 'Fase 3 — Finanzas operativas',
  4: 'Fase 4 — Operaciones + agente sobre datos',
  5: 'Fase 5 — Diferido / opcional',
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  planned:     { label: 'Planeado',   cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  in_progress: { label: 'En curso',   cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  done:        { label: 'Hecho',      cls: 'bg-green-50 text-green-700 border-green-200' },
  deferred:    { label: 'Diferido',   cls: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const IMPACT_CLS: Record<string, string> = {
  high: 'text-red-600', medium: 'text-amber-600', low: 'text-gray-400',
};

export default function RoadmapPage() {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState<number | null>(null);
  const [notesDraft, setNotesDraft] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setItems(await apiRequest('/roadmap') || []);
    } catch (e) {
      console.error('Failed to load roadmap', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const patch = async (id: number, body: Partial<RoadmapItem>) => {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, ...body } as RoadmapItem : i)));
    try {
      await apiRequest(`/roadmap/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    } catch (e) {
      console.error('Failed to update item', e);
      load(); // reconcile on failure
    }
  };

  const phases = useMemo(() => {
    const by: Record<number, RoadmapItem[]> = {};
    for (const it of items) (by[it.phase] ??= []).push(it);
    return Object.keys(by).map(Number).sort((a, b) => a - b).map(p => ({ phase: p, items: by[p] }));
  }, [items]);

  const total = items.length;
  const done = items.filter(i => i.status === 'done').length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold text-gray-800">Roadmap IMPAG</h1>
          <button onClick={load} className="text-sm text-blue-700 hover:underline">Actualizar</button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          {done} de {total} completado ({pct}%). Cambia el estado y agrega notas para dar seguimiento.
        </p>
        <div className="w-full h-2 bg-gray-100 rounded-full mb-6 overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>

        {loading ? (
          <p className="text-gray-500">Cargando…</p>
        ) : (
          phases.map(({ phase, items: phaseItems }) => {
            const pDone = phaseItems.filter(i => i.status === 'done').length;
            return (
              <section key={phase} className="mb-6">
                <div className="flex items-baseline justify-between mb-2">
                  <h2 className="text-sm font-semibold text-gray-700">{PHASE_LABELS[phase] ?? `Fase ${phase}`}</h2>
                  <span className="text-[11px] text-gray-400">{pDone}/{phaseItems.length}</span>
                </div>
                <div className="space-y-2">
                  {phaseItems.map(item => (
                    <div key={item.id} className="rounded-lg border border-gray-200 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-medium text-sm ${item.status === 'done' ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                              {item.title}
                            </span>
                            {item.impact && <span className={`text-[10px] font-semibold ${IMPACT_CLS[item.impact] || ''}`}>{item.impact.toUpperCase()}</span>}
                            {item.effort && <span className="text-[10px] text-gray-400">{item.effort}</span>}
                          </div>
                          {item.description && <p className="text-xs text-gray-500 mt-1">{item.description}</p>}
                          {item.need && <p className="text-[10px] text-gray-400 mt-1">🎯 {item.need}</p>}
                        </div>
                        <select
                          value={item.status}
                          onChange={e => patch(item.id, { status: e.target.value as RoadmapItem['status'] })}
                          className={`shrink-0 text-xs font-medium border rounded-md px-2 py-1 cursor-pointer ${STATUS_META[item.status]?.cls || ''}`}
                        >
                          {Object.entries(STATUS_META).map(([k, m]) => (
                            <option key={k} value={k}>{m.label}</option>
                          ))}
                        </select>
                      </div>

                      {editingNotes === item.id ? (
                        <textarea
                          autoFocus
                          value={notesDraft}
                          onChange={e => setNotesDraft(e.target.value)}
                          onBlur={() => { patch(item.id, { notes: notesDraft || null }); setEditingNotes(null); }}
                          rows={2}
                          placeholder="Notas de avance…"
                          className="w-full mt-2 text-xs border border-gray-300 rounded p-1.5 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                        />
                      ) : (
                        <button
                          onClick={() => { setEditingNotes(item.id); setNotesDraft(item.notes || ''); }}
                          className="mt-2 text-[11px] text-gray-400 hover:text-blue-600"
                        >
                          {item.notes ? `📝 ${item.notes}` : '+ agregar nota'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </MainLayout>
  );
}

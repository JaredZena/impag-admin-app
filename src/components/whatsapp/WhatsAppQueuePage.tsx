import { useEffect, useState, useCallback } from 'react';
import { apiRequest } from '@/utils/api';
import MainLayout from '@/components/layout/MainLayout';

interface Draft {
  id: number;
  conversation_id: number;
  draft_text: string;
  edited_text: string | null;
  ai_context: string | null;
  status: string;
  customer_phone: string;
  customer_name: string | null;
  created_at: string;
}

interface WAMessage {
  id: number;
  direction: 'inbound' | 'outbound';
  content: string;
  status: string;
  created_at: string;
}

export default function WhatsAppQueuePage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selected, setSelected] = useState<Draft | null>(null);
  const [thread, setThread] = useState<WAMessage[]>([]);
  const [editText, setEditText] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gateOpen, setGateOpen] = useState<boolean | null>(null);

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/whatsapp/drafts');
      setDrafts(data || []);
    } catch (e) {
      console.error('Failed to load drafts', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDrafts(); }, [loadDrafts]);

  const openDraft = async (d: Draft) => {
    setSelected(d);
    setEditText(d.edited_text ?? d.draft_text);
    try {
      const msgs = await apiRequest(`/whatsapp/conversations/${d.conversation_id}/messages`);
      setThread(msgs || []);
    } catch (e) {
      console.error('Failed to load thread', e);
      setThread([]);
    }
  };

  const afterAction = async () => {
    setSelected(null);
    setThread([]);
    await loadDrafts();
  };

  const approve = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      // Persist an edit first if the operator changed the text.
      if (editText.trim() && editText !== (selected.edited_text ?? selected.draft_text)) {
        await apiRequest(`/whatsapp/drafts/${selected.id}`, {
          method: 'PUT', body: JSON.stringify({ edited_text: editText }),
        });
      }
      const res = await apiRequest(`/whatsapp/drafts/${selected.id}/approve`, { method: 'POST' });
      setGateOpen(res?.gate_open ?? false);
      await afterAction();
    } catch (e) {
      console.error('Approve failed', e);
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await apiRequest(`/whatsapp/drafts/${selected.id}/reject`, { method: 'POST' });
      await afterAction();
    } catch (e) {
      console.error('Reject failed', e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-gray-800">WhatsApp — Cola de aprobación</h1>
          <button onClick={loadDrafts} className="text-sm text-blue-700 hover:underline">Actualizar</button>
        </div>

        {/* Send-gate banner: make it unmistakable that nothing is sent yet. */}
        {gateOpen !== true && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
            🔒 <strong>Modo de prueba (envío desactivado).</strong> Al aprobar, la respuesta se
            registra pero <strong>no se envía</strong> al cliente. El envío real se activa solo tras tu confirmación.
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Cargando…</p>
        ) : drafts.length === 0 ? (
          <p className="text-gray-500">No hay borradores pendientes. 🎉</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pending list */}
            <div className="space-y-2">
              {drafts.map((d) => (
                <button
                  key={d.id}
                  onClick={() => openDraft(d)}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    selected?.id === d.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-800 text-sm">
                      {d.customer_name || d.customer_phone}
                    </span>
                    <span className="text-[10px] text-gray-400">{d.customer_phone}</span>
                  </div>
                  {d.ai_context?.startsWith('Seguimiento') && (
                    <span className="inline-block mt-1 text-[9px] font-medium text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                      🔔 Seguimiento de cotización
                    </span>
                  )}
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{d.draft_text}</p>
                </button>
              ))}
            </div>

            {/* Detail + review */}
            <div className="rounded-lg border border-gray-200 p-4">
              {!selected ? (
                <p className="text-gray-400 text-sm">Selecciona un borrador para revisarlo.</p>
              ) : (
                <>
                  <div className="mb-3">
                    <h2 className="font-semibold text-gray-800 text-sm">
                      {selected.customer_name || selected.customer_phone}
                    </h2>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-2 mb-3 bg-gray-50 rounded p-2">
                    {thread.map((m) => (
                      <div key={m.id} className={`flex ${m.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`px-3 py-1.5 rounded-2xl text-xs max-w-[80%] ${
                          m.direction === 'inbound' ? 'bg-white border border-gray-200' : 'bg-green-100'
                        }`}>
                          {m.content}
                          {m.direction === 'outbound' && m.status === 'approved' && (
                            <span className="block text-[9px] text-amber-700 mt-0.5">aprobado · no enviado</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    🤖 Borrador de la IA (edítalo si hace falta)
                  </label>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={4}
                    className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  />

                  {selected.ai_context && (
                    <details className="mt-2 text-[11px] text-gray-500">
                      <summary className="cursor-pointer">
                        {selected.ai_context.startsWith('Seguimiento') ? 'Motivo del seguimiento' : 'Contexto de producto usado'}
                      </summary>
                      <pre className="whitespace-pre-wrap mt-1">{selected.ai_context}</pre>
                    </details>
                  )}

                  <div className="flex gap-2 mt-3">
                    <button onClick={approve} disabled={busy || !editText.trim()}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2">
                      ✅ Aprobar
                    </button>
                    <button onClick={reject} disabled={busy}
                      className="px-4 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 text-sm font-medium rounded-lg py-2">
                      ❌ Rechazar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

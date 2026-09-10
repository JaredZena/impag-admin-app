import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, MessageCircle, Pencil } from 'lucide-react';
import Modal from '@/components/pos/Modal';
import ProductImagesSection from '@/components/product/ProductImagesSection';
import { useNotifications } from '@/components/ui/notification';
import { ApiError } from '@/utils/api';
import {
  addToolMovement,
  deleteTool,
  dmy,
  getTool,
  money,
  movementWhatsAppText,
  qty,
  todayISO,
  updateTool,
  TOOL_LOCATIONS,
  type ToolDetail,
  type ToolMovement,
  type ToolStatus,
} from '@/utils/toolsApi';
import ToolForm from './ToolForm';
import { buildUpdatePayload, toolToForm, type ToolFormValues } from './toolFormModel';
import { buttonClass, copyText, inputClass, whatsappShareUrl } from './toolHelpers';
import { StatusPill } from './toolUi';

// NOTE: ProtectedRoute already wraps every route in MainLayout — do NOT import it here.

type ActionKey = 'recibida' | 'salida_obra' | 'salida_cliente' | 'regreso' | 'baja' | 'reactivar';

interface ActionDef {
  label: string;
  title: string;
  to: ToolStatus;
  toast: string;
  holder?: 'obra' | 'cliente';
  reason?: boolean;
  location?: boolean;
  tone: 'primary' | 'secondary' | 'danger';
}

const ACTIONS: Record<ActionKey, ActionDef> = {
  recibida: { label: 'Marcar como recibida', title: 'Recibida en el local', to: 'en_local', toast: 'Marcada como recibida', location: true, tone: 'primary' },
  salida_obra: { label: 'Salida a obra', title: 'Salida a obra', to: 'en_obra', toast: 'Salida registrada', holder: 'obra', tone: 'primary' },
  salida_cliente: { label: 'Prestar a cliente', title: 'Prestar a cliente', to: 'con_cliente', toast: 'Préstamo registrado', holder: 'cliente', tone: 'secondary' },
  regreso: { label: 'Regresó al local', title: 'Regreso al local', to: 'en_local', toast: 'Regreso registrado', location: true, tone: 'primary' },
  baja: { label: 'Dar de baja', title: 'Dar de baja', to: 'baja', toast: 'Herramienta dada de baja', reason: true, tone: 'danger' },
  reactivar: { label: 'Reactivar', title: 'Reactivar herramienta', to: 'en_local', toast: 'Herramienta reactivada', location: true, tone: 'primary' },
};

const ACTIONS_BY_STATUS: Record<ToolStatus, ActionKey[]> = {
  en_local: ['salida_obra', 'salida_cliente', 'baja'],
  pendiente_entrega: ['recibida', 'salida_obra', 'baja'],
  en_obra: ['regreso', 'baja'],
  con_cliente: ['regreso', 'baja'],
  baja: ['reactivar'],
};

const HOLDER_LABELS: Partial<Record<ToolStatus, string>> = {
  en_obra: 'En obra',
  con_cliente: 'Cliente',
  pendiente_entrega: 'La tiene',
};

const Item: React.FC<{ label: string; value: React.ReactNode; full?: boolean }> = ({ label, value, full }) => (
  <div className={full ? 'sm:col-span-2' : ''}>
    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
    <dd className="mt-0.5 whitespace-pre-line break-words text-sm text-gray-900">{value}</dd>
  </div>
);

const labelClass = 'mb-1 block text-sm font-medium text-gray-700';

export default function ToolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { addNotification } = useNotifications();
  // Read once: arriving from "Registrar herramienta" shows the WhatsApp notice.
  const justCreatedRef = useRef(Boolean((location.state as { justCreated?: boolean } | null)?.justCreated));

  const [tool, setTool] = useState<ToolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [action, setAction] = useState<ActionKey | null>(null);
  const [holder, setHolder] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayISO);
  const [place, setPlace] = useState('Nuevo Ideal');
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // WhatsApp-ready text for the last event, shown until dismissed.
  const [message, setMessage] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<ToolFormValues | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    getTool(id)
      .then((t) => {
        if (cancelled) return;
        setTool(t);
        setLoadError(null);
        if (justCreatedRef.current && t.movements[0]) {
          justCreatedRef.current = false;
          setMessage(movementWhatsAppText(t, t.movements[0]));
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiError && err.status === 404
            ? 'Esta herramienta no existe o fue eliminada.'
            : err instanceof Error
              ? err.message
              : 'No se pudo cargar la herramienta.'
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const notifyCopy = async (text: string) => {
    const ok = await copyText(text);
    addNotification(
      ok
        ? { type: 'success', title: 'Mensaje copiado', message: 'Pégalo en WhatsApp.' }
        : { type: 'error', title: 'No se pudo copiar el mensaje' }
    );
  };

  const openAction = (key: ActionKey) => {
    setAction(key);
    setHolder('');
    setNote('');
    setDate(todayISO());
    setPlace(tool?.location || 'Nuevo Ideal');
    setActionError(null);
  };

  const submitAction = async () => {
    if (!tool || !action) return;
    const def = ACTIONS[action];
    if (def.holder && !holder.trim()) {
      setActionError(def.holder === 'cliente' ? 'Escribe el nombre del cliente.' : 'Indica la obra o la persona.');
      return;
    }
    if (def.reason && !note.trim()) {
      setActionError('Escribe el motivo de la baja.');
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      const updated = await addToolMovement(tool.id, {
        to_status: def.to,
        holder: def.holder ? holder.trim() : null,
        note: note.trim() || null,
        occurred_on: date || null,
        location: def.location ? place || null : null,
      });
      setTool(updated);
      setAction(null);
      if (updated.movements[0]) setMessage(movementWhatsAppText(updated, updated.movements[0]));
      addNotification({ type: 'success', title: def.toast });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = () => {
    if (!tool) return;
    setEditValues(toolToForm(tool));
    setEditError(null);
    setEditing(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tool || !editValues) return;
    const built = buildUpdatePayload(editValues, tool.status);
    if ('error' in built) {
      setEditError(built.error);
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    try {
      const updated = await updateTool(tool.id, built.payload);
      setTool(updated);
      setEditing(false);
      addNotification({ type: 'success', title: 'Cambios guardados' });
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!tool) return;
    setDeleting(true);
    try {
      await deleteTool(tool.id);
      addNotification({ type: 'success', title: 'Registro eliminado' });
      navigate('/tools', { replace: true });
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'No se pudo eliminar',
        message: err instanceof Error ? err.message : 'Intenta de nuevo.',
      });
      setDeleting(false);
    }
  };

  const backLink = (
    <Link to="/tools" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
      <ArrowLeft size={16} />
      Herramientas
    </Link>
  );

  if (loading && !tool) {
    return <p className="py-12 text-center text-sm text-gray-500">Cargando…</p>;
  }
  if (loadError || !tool) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        {backLink}
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {loadError ?? 'No se pudo cargar la herramienta.'}
        </div>
      </div>
    );
  }

  const def = action ? ACTIONS[action] : null;
  const placeOptions =
    place && !TOOL_LOCATIONS.includes(place) ? [place, ...TOOL_LOCATIONS] : TOOL_LOCATIONS;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {backLink}

      <header className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={tool.status} />
          {tool.kind === 'consumible' && <span className="text-xs text-gray-500">Consumible</span>}
        </div>
        <h1 className="mt-1 break-words text-xl font-bold text-gray-900 sm:text-2xl">{tool.name}</h1>
        <p className="mt-1 text-sm tabular-nums text-gray-600">
          {qty(tool.quantity)} {tool.unit} · {money(tool.unit_cost)} c/u · Total {money(tool.total_value)}
        </p>
        {tool.holder && (
          <p className="mt-1 text-sm text-gray-800">
            <span className="text-gray-500">{HOLDER_LABELS[tool.status] ?? 'La tenía'}:</span> {tool.holder}
          </p>
        )}
        {tool.status === 'baja' && tool.retired_reason && (
          <p className="mt-1 text-sm text-gray-800">
            <span className="text-gray-500">Motivo de la baja:</span> {tool.retired_reason}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {(ACTIONS_BY_STATUS[tool.status] ?? []).map((key) => (
            <button key={key} type="button" onClick={() => openAction(key)} className={buttonClass[ACTIONS[key].tone]}>
              {ACTIONS[key].label}
            </button>
          ))}
        </div>
      </header>

      {message && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-emerald-900">Avisa al equipo</p>
            <button
              type="button"
              onClick={() => setMessage(null)}
              className="text-xs font-medium text-emerald-800 hover:underline"
            >
              Cerrar
            </button>
          </div>
          <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-white/80 p-3 font-mono text-xs text-gray-800">
            {message}
          </pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => notifyCopy(message)} className={buttonClass.secondary}>
              <Copy size={16} />
              Copiar
            </button>
            <a href={whatsappShareUrl(message)} target="_blank" rel="noreferrer" className={buttonClass.primary}>
              <MessageCircle size={16} />
              Enviar por WhatsApp
            </a>
          </div>
        </section>
      )}

      <ProductImagesSection
        key={tool.id}
        productId={String(tool.id)}
        resourcePath={`/tools/${tool.id}`}
        initialImages={tool.images}
        title="Fotos"
        emptyMessage="Sin fotos. Toma una foto de la herramienta para reconocerla rápido."
      />

      <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-gray-900">Datos</h2>
          {!editing && (
            <button type="button" onClick={startEdit} className={buttonClass.secondary}>
              <Pencil size={16} />
              Editar
            </button>
          )}
        </div>
        {editing && editValues ? (
          <form onSubmit={saveEdit} className="mt-4 space-y-5">
            <ToolForm values={editValues} onChange={setEditValues} mode="edit" currentStatus={tool.status} />
            {editError && <p className="text-sm text-red-600">{editError}</p>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setEditing(false)} disabled={savingEdit} className={buttonClass.secondary}>
                Cancelar
              </button>
              <button type="submit" disabled={savingEdit} className={buttonClass.primary}>
                {savingEdit ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        ) : (
          <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <Item label="Tipo" value={tool.kind === 'consumible' ? 'Consumible' : 'Herramienta'} />
            <Item label="Cantidad" value={`${qty(tool.quantity)} ${tool.unit}`} />
            <Item label="Costo unitario" value={money(tool.unit_cost)} />
            <Item label="Valor" value={money(tool.total_value)} />
            <Item label="Fecha de compra" value={dmy(tool.purchase_date)} />
            <Item label="Proveedor" value={tool.supplier_name ?? '—'} />
            <Item label="Factura o nota" value={tool.invoice_ref ?? '—'} />
            <Item label="Ubicación" value={tool.location ?? '—'} />
            {tool.notes && <Item label="Comentario" value={tool.notes} full />}
          </dl>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        <h2 className="text-base font-semibold text-gray-900">Historial</h2>
        {tool.movements.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">Sin movimientos.</p>
        ) : (
          <ol className="mt-4 space-y-4">
            {tool.movements.map((m: ToolMovement) => (
              <li key={m.id} className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gray-300" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-medium text-gray-900">{m.kind_label}</span>
                    {m.to_status && m.kind !== 'ajuste' && <StatusPill status={m.to_status} />}
                    <span className="text-xs text-gray-500">{dmy(m.occurred_on ?? m.created_at)}</span>
                  </div>
                  {m.holder && <p className="text-sm text-gray-700">{m.holder}</p>}
                  {m.note && <p className="whitespace-pre-line break-words text-sm text-gray-600">{m.note}</p>}
                  {m.created_by && <p className="text-xs text-gray-400">{m.created_by.split('@')[0]}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => notifyCopy(movementWhatsAppText(tool, m))}
                  className="self-start rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  title="Copiar para WhatsApp"
                  aria-label="Copiar este movimiento para WhatsApp"
                >
                  <Copy size={14} />
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="pb-6 text-center">
        {confirmDelete ? (
          <div className="mx-auto max-w-md space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 text-left">
            <p className="text-sm text-red-800">
              Eliminar borra el registro y su historial. Úsalo solo para capturas por error. Si la herramienta se rompió, se
              perdió o se vendió, usa Dar de baja.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmDelete(false)} disabled={deleting} className={buttonClass.secondary}>
                Cancelar
              </button>
              <button type="button" onClick={handleDelete} disabled={deleting} className={buttonClass.dangerSolid}>
                {deleting ? 'Eliminando…' : 'Eliminar registro'}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="text-sm text-gray-400 hover:text-red-600">
            Eliminar registro
          </button>
        )}
      </div>

      {action && def && (
        <Modal title={def.title} onClose={() => !saving && setAction(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitAction();
            }}
            className="space-y-4"
          >
            {def.holder && (
              <label className="block">
                <span className={labelClass}>
                  {def.holder === 'cliente' ? 'Cliente' : '¿A qué obra o con quién?'}
                  <span className="text-red-500"> *</span>
                </span>
                <input
                  autoFocus
                  className={inputClass}
                  value={holder}
                  onChange={(e) => setHolder(e.target.value)}
                  placeholder={def.holder === 'cliente' ? 'Nombre del cliente' : 'Obra bombeo Rodeo, Chubeto…'}
                  maxLength={200}
                />
              </label>
            )}
            {def.location && (
              <label className="block">
                <span className={labelClass}>¿Dónde queda?</span>
                <select className={inputClass} value={place} onChange={(e) => setPlace(e.target.value)}>
                  {placeOptions.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block">
              <span className={labelClass}>Fecha</span>
              <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="block">
              <span className={labelClass}>
                {def.reason ? (
                  <>
                    Motivo<span className="text-red-500"> *</span>
                  </>
                ) : (
                  'Nota (opcional)'
                )}
              </span>
              <textarea
                className={inputClass}
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={def.reason ? 'Se rompió, se perdió en la obra, se vendió…' : ''}
                maxLength={2000}
                autoFocus={!def.holder && Boolean(def.reason)}
              />
            </label>
            {actionError && <p className="text-sm text-red-600">{actionError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAction(null)} disabled={saving} className={buttonClass.secondary}>
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className={def.tone === 'danger' ? buttonClass.dangerSolid : buttonClass.primary}
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

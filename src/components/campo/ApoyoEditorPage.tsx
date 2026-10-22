import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Save, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';
import {
  createApoyo,
  deleteApoyo,
  getApoyo,
  setApoyoStatus,
  updateApoyo,
} from '@/utils/apoyosApi';
import type { ApoyoAdmin, ApoyoInput, ApoyoStatus } from '@/types/apoyos';
import {
  STATE_OPTIONS,
  SECTOR_OPTIONS,
  SUPPORT_TYPE_OPTIONS,
  LEVEL_OPTIONS,
  STORE_CATEGORY_OPTIONS,
  STOREFRONT_URL,
} from '@/utils/campoTaxonomy';
import { useNotifications } from '@/components/ui/notification';
import LoadError from '@/components/ui/LoadError';
import { ApoyoConfidenceBadge, ApoyoStatusBadge } from './apoyos/badges';
import { ChipsMultiSelect, ListEditor, SourcesEditor } from './apoyos/FormControls';
import PublishSiteButton from './apoyos/PublishSiteButton';

const EMPTY_INPUT: ApoyoInput = {
  title: '',
  program: '',
  organism: '',
  level: '',
  states: [],
  sectors: [],
  support_types: [],
  summary: '',
  description: '',
  beneficiaries: '',
  amount_text: '',
  amount_max_mxn: null,
  requirements: [],
  how_to_apply: [],
  opens_at: null,
  closes_at: null,
  deadline_text: '',
  permanent: false,
  year: null,
  source_url: '',
  sources: [],
  category_slugs: [],
  featured: false,
};

function toInput(apoyo: ApoyoAdmin): ApoyoInput {
  return {
    title: apoyo.title,
    program: apoyo.program,
    organism: apoyo.organism,
    level: apoyo.level,
    states: apoyo.states,
    sectors: apoyo.sectors,
    support_types: apoyo.support_types,
    summary: apoyo.summary,
    description: apoyo.description,
    beneficiaries: apoyo.beneficiaries,
    amount_text: apoyo.amount_text,
    amount_max_mxn: apoyo.amount_max_mxn,
    requirements: apoyo.requirements,
    how_to_apply: apoyo.how_to_apply,
    opens_at: apoyo.opens_at,
    closes_at: apoyo.closes_at,
    deadline_text: apoyo.deadline_text,
    permanent: apoyo.permanent,
    year: apoyo.year,
    source_url: apoyo.source_url,
    sources: apoyo.sources,
    category_slugs: apoyo.category_slugs,
    featured: apoyo.featured,
    slug: apoyo.slug,
  };
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-800">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-800">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}

export default function ApoyoEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const isNew = id === undefined;

  const [original, setOriginal] = useState<ApoyoAdmin | null>(null);
  const [form, setForm] = useState<ApoyoInput>(EMPTY_INPUT);
  const [loading, setLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const dirty = useMemo(() => {
    const baseline = original ? toInput(original) : EMPTY_INPUT;
    return JSON.stringify(baseline) !== JSON.stringify(form);
  }, [original, form]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const load = () => {
    if (isNew || !id) return;
    // Right after create() we already have the fresh record (set below) and
    // just navigated to its edit URL — skip the redundant re-fetch.
    if (original && original.id === Number(id)) return;
    setLoading(true);
    setLoadError(null);
    getApoyo(Number(id))
      .then((apoyo) => {
        setOriginal(apoyo);
        setForm(toInput(apoyo));
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Intenta de nuevo.'))
      .finally(() => setLoading(false));
  };

  // Intentionally not keyed on `original`: it only guards against the
  // redundant re-fetch right after create() navigates to the new edit URL.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [id, isNew]);

  const confirmDiscard = () => !dirty || window.confirm('Hay cambios sin guardar. ¿Salir sin guardarlos?');

  const handleBack = () => {
    if (confirmDiscard()) navigate('/apoyos');
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setSaveError('El título es obligatorio.');
      return;
    }
    setSaveError(null);
    setSaving(true);
    try {
      if (isNew) {
        const created = await createApoyo(form);
        setOriginal(created);
        setForm(toInput(created));
        addNotification({ type: 'success', title: 'Apoyo creado' });
        navigate(`/apoyos/${created.id}`, { replace: true });
      } else if (original) {
        const updated = await updateApoyo(original.id, form);
        setOriginal(updated);
        setForm(toInput(updated));
        addNotification({ type: 'success', title: 'Cambios guardados' });
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (status: ApoyoStatus) => {
    if (!original) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await setApoyoStatus(original.id, status);
      setOriginal(updated);
      setForm(toInput(updated));
      addNotification({ type: 'success', title: 'Estado actualizado' });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'No se pudo cambiar el estado');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!original) return;
    if (!window.confirm('¿Eliminar este apoyo? No se puede deshacer.')) return;
    setSaving(true);
    try {
      await deleteApoyo(original.id);
      addNotification({ type: 'success', title: 'Apoyo eliminado' });
      navigate('/apoyos');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'No se pudo eliminar (¿ya está publicado?)');
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-400">Cargando...</div>;
  if (loadError) return <div className="p-6"><LoadError message={loadError} onRetry={load} /></div>;

  const status = original?.status;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div className="flex items-start gap-3 min-w-0">
          <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-lg shrink-0">
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{isNew ? 'Nuevo apoyo' : original?.title || 'Apoyo'}</h1>
              {status && <ApoyoStatusBadge status={status} />}
              {original && <ApoyoConfidenceBadge confidence={original.confidence} />}
            </div>
            {original?.status === 'published' && original.slug && (
              <a
                href={`${STOREFRONT_URL}/apoyos/${original.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
              >
                Ver en la tienda <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-2">
          {!isNew && status !== 'published' && (
            <button
              onClick={() => handleStatus('published')}
              disabled={saving}
              className="px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Publicar
            </button>
          )}
          {!isNew && status === 'published' && (
            <button
              onClick={() => handleStatus('draft')}
              disabled={saving}
              className="px-3 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Despublicar
            </button>
          )}
          {!isNew && status !== 'rejected' && (
            <button
              onClick={() => handleStatus('rejected')}
              disabled={saving}
              className="px-3 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Descartar
            </button>
          )}
          {!isNew && status !== 'archived' && (
            <button
              onClick={() => handleStatus('archived')}
              disabled={saving}
              className="px-3 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Archivar
            </button>
          )}
          {!isNew && (status === 'draft' || status === 'rejected') && (
            <button
              onClick={handleDelete}
              disabled={saving}
              className="px-3 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 size={14} className="inline -mt-0.5 mr-1" />
              Eliminar
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {!isNew && original?.status === 'published' && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-blue-800">
            Pulsa «Publicar en la tienda» para que aparezca en todoparaelcampo.com.mx (o espera la publicación diaria).
          </p>
          <PublishSiteButton />
        </div>
      )}

      {saveError && <p className="text-sm text-red-600 mb-4">{saveError}</p>}

      <div className="space-y-6">
        {/* Basic info */}
        <section className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
          <p className="font-medium text-gray-900">Información básica</p>
          <TextField label="Título" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField label="Programa" value={form.program || ''} onChange={(v) => setForm({ ...form, program: v })} />
            <TextField label="Organismo" value={form.organism || ''} onChange={(v) => setForm({ ...form, organism: v })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-800">Nivel</span>
              <select
                value={form.level || ''}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sin especificar</option>
                {LEVEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <TextField
              label="Año"
              type="number"
              value={form.year != null ? String(form.year) : ''}
              onChange={(v) => setForm({ ...form, year: v ? Number(v) : null })}
            />
            <TextField label="Slug" value={form.slug || ''} onChange={(v) => setForm({ ...form, slug: v })} />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              className="h-4 w-4 accent-blue-600"
            />
            <span className="text-sm text-gray-800">Destacado</span>
          </label>
        </section>

        {/* Taxonomy */}
        <section className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
          <p className="font-medium text-gray-900">Clasificación</p>
          <div>
            <p className="text-sm font-medium text-gray-800 mb-1.5">Estados</p>
            <ChipsMultiSelect options={STATE_OPTIONS} value={form.states || []} onChange={(states) => setForm({ ...form, states })} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800 mb-1.5">Sectores</p>
            <ChipsMultiSelect options={SECTOR_OPTIONS} value={form.sectors || []} onChange={(sectors) => setForm({ ...form, sectors })} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800 mb-1.5">Tipo de apoyo</p>
            <ChipsMultiSelect
              options={SUPPORT_TYPE_OPTIONS}
              value={form.support_types || []}
              onChange={(support_types) => setForm({ ...form, support_types })}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800 mb-1.5">Categorías de la tienda que puede financiar</p>
            <ChipsMultiSelect
              options={STORE_CATEGORY_OPTIONS}
              value={form.category_slugs || []}
              onChange={(category_slugs) => setForm({ ...form, category_slugs })}
            />
          </div>
        </section>

        {/* Content */}
        <section className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
          <p className="font-medium text-gray-900">Contenido</p>
          <TextArea label="Resumen" value={form.summary || ''} onChange={(v) => setForm({ ...form, summary: v })} />
          <TextArea label="Descripción" value={form.description || ''} onChange={(v) => setForm({ ...form, description: v })} />
          <TextArea label="Para quién (beneficiarios)" value={form.beneficiaries || ''} onChange={(v) => setForm({ ...form, beneficiaries: v })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField label="Monto (texto)" value={form.amount_text || ''} onChange={(v) => setForm({ ...form, amount_text: v })} />
            <TextField
              label="Monto máximo (MXN)"
              type="number"
              value={form.amount_max_mxn != null ? String(form.amount_max_mxn) : ''}
              onChange={(v) => setForm({ ...form, amount_max_mxn: v ? Number(v) : null })}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800 mb-1.5">Requisitos</p>
            <ListEditor value={form.requirements || []} onChange={(requirements) => setForm({ ...form, requirements })} placeholder="Agregar requisito" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800 mb-1.5">Cómo solicitarlo</p>
            <ListEditor value={form.how_to_apply || []} onChange={(how_to_apply) => setForm({ ...form, how_to_apply })} placeholder="Agregar paso" />
          </div>
        </section>

        {/* Dates */}
        <section className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
          <p className="font-medium text-gray-900">Vigencia</p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!form.permanent}
              onChange={(e) => setForm({ ...form, permanent: e.target.checked })}
              className="h-4 w-4 accent-blue-600"
            />
            <span className="text-sm text-gray-800">Ventana permanente (todo el año)</span>
          </label>
          {!form.permanent && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField label="Abre" type="date" value={form.opens_at || ''} onChange={(v) => setForm({ ...form, opens_at: v || null })} />
              <TextField label="Cierra" type="date" value={form.closes_at || ''} onChange={(v) => setForm({ ...form, closes_at: v || null })} />
            </div>
          )}
          <TextField label="Fecha límite (texto)" value={form.deadline_text || ''} onChange={(v) => setForm({ ...form, deadline_text: v })} />
        </section>

        {/* Sources */}
        <section className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
          <p className="font-medium text-gray-900">Fuentes</p>
          <TextField label="Fuente principal (URL)" value={form.source_url || ''} onChange={(v) => setForm({ ...form, source_url: v })} />
          {form.source_url && (
            <a href={form.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
              Abrir fuente principal <ExternalLink size={11} />
            </a>
          )}
          <div>
            <p className="text-sm font-medium text-gray-800 mb-1.5">Otras fuentes</p>
            <SourcesEditor value={form.sources || []} onChange={(sources) => setForm({ ...form, sources })} />
          </div>
        </section>

        {/* AI info (read-only) */}
        {original && (
          <section className="bg-gray-50 border border-gray-100 rounded-xl p-5 space-y-2 text-sm">
            <p className="font-medium text-gray-900 mb-2">Información de la IA</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-600">
              <p>Visto por primera vez: {original.first_seen_at ? dayjs(original.first_seen_at).format('DD MMM YYYY') : '—'}</p>
              <p>Última verificación: {original.last_seen_at ? dayjs(original.last_seen_at).format('DD MMM YYYY') : '—'}</p>
              <p>
                Corrida que lo encontró:{' '}
                {original.discovered_run_id ? (
                  <Link to="/apoyos?tab=ejecuciones" className="text-blue-600 hover:underline">
                    #{original.discovered_run_id}
                  </Link>
                ) : (
                  'manual'
                )}
              </p>
              <p>Publicado: {original.published_at ? dayjs(original.published_at).format('DD MMM YYYY') : '—'}</p>
            </div>
            {original.ai_notes && (
              <p className="mt-2 whitespace-pre-wrap bg-white border border-gray-100 rounded-lg p-3 text-gray-700">
                {original.ai_notes}
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, FileText, MessageCircle } from 'lucide-react';
import { getAgroProject, patchAgroProject } from '@/utils/agroApi';
import type { AgroAdmin, LeadStatus } from '@/types/agro';
import { STATE_LABELS, formatUsd } from '@/utils/campoTaxonomy';
import { featureLabel } from '@/utils/aiFeatureLabels';
import { formatCurrency } from '@/utils/currencyUtils';
import { formatDateTime } from '@/utils/dateUtils';
import { useNotifications } from '@/components/ui/notification';
import LoadError from '@/components/ui/LoadError';
import { Card, CardSkeleton, EmptyState, errorText } from './shared/Primitives';
import { AgroPlanView } from './agro/AgroPlanView';
import { AgroStatusBadge, GeneratingBadge, LEAD_STATUS_OPTIONS } from './agro/AgroStatusBadges';

const WATER_LABELS: Record<string, string> = {
  pozo: 'Pozo',
  'rio-canal': 'Río o canal',
  red: 'Red de agua',
  'presa-bordo': 'Presa o bordo',
  temporal: 'Temporal (lluvia)',
  ninguna: 'Sin agua',
  'no-se': 'No sabe',
};
const ELECTRICITY_LABELS: Record<string, string> = { cfe: 'CFE', no: 'Sin electricidad', 'no-se': 'No sabe' };
const EXPERIENCE_LABELS: Record<string, string> = { ninguna: 'Ninguna', algo: 'Algo', mucha: 'Mucha' };
const GOAL_LABELS: Record<string, string> = {
  autoconsumo: 'Autoconsumo',
  'venta-local': 'Venta local',
  negocio: 'Negocio',
  'no-se': 'No sabe',
};
const TIMELINE_LABELS: Record<string, string> = {
  ya: 'Ya / lo antes posible',
  '3-meses': 'En 3 meses',
  '6-meses': 'En 6 meses',
  explorando: 'Solo explorando',
};
const PRODUCER_TYPE_LABELS: Record<string, string> = {
  nuevo: 'Nuevo productor',
  mejorar: 'Mejorar lo que ya tiene',
  diversificar: 'Diversificar',
};
const PREFERRED_LABELS: Record<string, string> = { whatsapp: 'WhatsApp', llamada: 'Llamada', correo: 'Correo' };

export default function AgroDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [project, setProject] = useState<AgroAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [assignee, setAssignee] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  const projectId = Number(id);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const p = await getAgroProject(projectId);
        if (!cancelled) {
          setProject(p);
          setNotes(p.staff_notes ?? '');
          setAssignee(p.assigned_to ?? '');
        }
      } catch (err) {
        if (!cancelled) setLoadError(errorText(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, retry]);

  const patch = useCallback(
    async (fields: Partial<Pick<AgroAdmin, 'lead_status' | 'staff_notes' | 'assigned_to'>>) => {
      const updated = await patchAgroProject(projectId, fields);
      setProject(updated);
      return updated;
    },
    [projectId]
  );

  const onLeadStatusChange = async (value: LeadStatus) => {
    setSavingStatus(true);
    try {
      await patch({ lead_status: value });
    } catch (err) {
      addNotification({ type: 'error', title: 'No se pudo cambiar el estado', message: errorText(err) });
    } finally {
      setSavingStatus(false);
    }
  };

  const saveAssignee = async () => {
    if (!project || assignee === (project.assigned_to ?? '')) return;
    try {
      await patch({ assigned_to: assignee || null });
    } catch (err) {
      addNotification({ type: 'error', title: 'No se pudo guardar el responsable', message: errorText(err) });
    }
  };

  const saveNotes = async () => {
    if (!project) return;
    setSavingNotes(true);
    try {
      await patch({ staff_notes: notes });
      addNotification({ type: 'success', title: 'Notas guardadas' });
    } catch (err) {
      addNotification({ type: 'error', title: 'No se pudieron guardar las notas', message: errorText(err) });
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <Card>
          <CardSkeleton rows={8} />
        </Card>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <LoadError message={loadError} onRetry={() => setRetry((r) => r + 1)} />
      </div>
    );
  }
  if (!project) return null;

  const usageTotal = project.usage.reduce((acc, u) => acc + u.cost_usd, 0);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <button
        type="button"
        onClick={() => navigate('/agroproyectos?tab=leads')}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-3"
      >
        <ArrowLeft size={15} /> Leads de Agroproyectos
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{project.title ?? project.ref}</h1>
            <AgroStatusBadge status={project.status} />
            {project.generating && <GeneratingBadge step={project.generating} since={project.generating_since} />}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {project.ref} · creado {formatDateTime(project.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {project.whatsapp_url && (
            <a
              href={project.whatsapp_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 text-white px-3 py-2 text-sm font-medium hover:bg-green-700"
            >
              <MessageCircle size={15} /> WhatsApp
            </a>
          )}
          <a
            href={project.public_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ExternalLink size={15} /> Ver plan público
          </a>
          {project.quote && (
            <Link
              to={`/quotes/${project.quote.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <FileText size={15} /> {project.quote.quote_number}
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Estado del lead</label>
          <select
            value={project.lead_status}
            disabled={savingStatus}
            onChange={(e) => onLeadStatusChange(e.target.value as LeadStatus)}
            className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm shadow-sm"
          >
            {LEAD_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Responsable</label>
          <input
            type="email"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            onBlur={saveAssignee}
            placeholder="correo@impag.mx"
            className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm shadow-sm"
          />
        </div>
        {project.cost_usd > 0 && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Costo IA</label>
            <p className="text-sm font-semibold text-gray-900 h-9 flex items-center">{formatUsd(project.cost_usd)}</p>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-[280px_1fr_280px] gap-4">
        {/* Left */}
        <div className="space-y-4 lg:order-1">
          <Card title="Datos del productor">
            <dl className="space-y-2 text-sm">
              <Row label="Tipo" value={PRODUCER_TYPE_LABELS[project.producer_type ?? ''] ?? '—'} />
              <Row label="Idea" value={project.inputs.idea} block />
              {project.inputs.current_operation && <Row label="Situación actual" value={project.inputs.current_operation} block />}
              <Row label="Estado" value={STATE_LABELS[project.inputs.state ?? ''] ?? '—'} />
              <Row label="Municipio" value={project.inputs.municipio ?? '—'} />
              <Row
                label="Terreno"
                value={
                  project.inputs.land?.has_land
                    ? `${project.inputs.land.area ?? '?'} ${project.inputs.land.unit}`
                    : 'No tiene terreno'
                }
              />
              <Row label="Agua" value={WATER_LABELS[project.inputs.water ?? ''] ?? '—'} />
              <Row label="Electricidad" value={ELECTRICITY_LABELS[project.inputs.electricity ?? ''] ?? '—'} />
              <Row label="Experiencia" value={EXPERIENCE_LABELS[project.inputs.experience ?? ''] ?? '—'} />
              <Row label="Objetivo" value={GOAL_LABELS[project.inputs.goal ?? ''] ?? '—'} />
              <Row label="Cuándo" value={TIMELINE_LABELS[project.inputs.timeline ?? ''] ?? '—'} />
              <Row
                label="Presupuesto"
                value={project.inputs.budget_unknown ? 'No sabe cuánto' : formatCurrency(project.inputs.budget_mxn)}
              />
              <Row label="Interesado en financiamiento" value={project.inputs.wants_financing ? 'Sí' : 'No'} />
            </dl>
          </Card>

          {project.contact_request && (
            <Card title="Pidió que lo contacten">
              <dl className="space-y-2 text-sm">
                <Row label="Prefiere" value={PREFERRED_LABELS[project.contact_request.preferred] ?? project.contact_request.preferred} />
                {project.contact_request.best_time && <Row label="Mejor horario" value={project.contact_request.best_time} />}
                {project.contact_request.message && <Row label="Mensaje" value={project.contact_request.message} block />}
                <Row label="Fecha" value={formatDateTime(project.contact_requested_at)} />
              </dl>
            </Card>
          )}

          {project.apoyos.length > 0 && (
            <Card title="Apoyos relacionados">
              <ul className="space-y-2">
                {project.apoyos.map((a) => (
                  <li key={a.slug}>
                    <Link to={`/apoyos/${a.slug}`} className="text-sm text-blue-600 hover:underline">
                      {a.title}
                    </Link>
                    {a.amount_text && <p className="text-xs text-gray-500">{a.amount_text}</p>}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {(project.utm?.source || project.utm?.apoyo) && (
            <Card title="Origen">
              <dl className="space-y-2 text-sm">
                {project.utm.source && <Row label="Fuente" value={project.utm.source} />}
                {project.utm.medium && <Row label="Medio" value={project.utm.medium} />}
                {project.utm.campaign && <Row label="Campaña" value={project.utm.campaign} />}
                {project.utm.apoyo && <Row label="Apoyo" value={project.utm.apoyo} />}
              </dl>
            </Card>
          )}
        </div>

        {/* Main */}
        <div className="lg:order-2">
          {project.error && (
            <Card>
              <p className="text-sm text-red-700">Error en la generación: {project.error}</p>
            </Card>
          )}
          <AgroPlanView plan={project.plan} products={project.products} irrigation={project.irrigation} messages={project.messages} />
        </div>

        {/* Right */}
        <div className="space-y-4 lg:order-3">
          <Card title="Notas del equipo">
            <textarea
              rows={6}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            />
            <button
              type="button"
              onClick={saveNotes}
              disabled={savingNotes || notes === (project.staff_notes ?? '')}
              className="mt-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {savingNotes ? 'Guardando…' : 'Guardar notas'}
            </button>
          </Card>

          <Card title="Uso de IA">
            {project.usage.length === 0 ? (
              <EmptyState message="Sin llamadas de IA registradas." />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-gray-500 py-1.5 pr-2">Paso</th>
                        <th className="text-right text-gray-500 py-1.5 pr-2">Tokens</th>
                        <th className="text-right text-gray-500 py-1.5 pr-2">Costo</th>
                        <th className="text-right text-gray-500 py-1.5">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.usage.map((u) => (
                        <tr key={u.id} className="border-b border-gray-50 last:border-0">
                          <td className="py-1.5 pr-2 text-gray-900">{featureLabel(u.feature)}</td>
                          <td className="py-1.5 pr-2 text-right text-gray-600 whitespace-nowrap">
                            {u.input_tokens}/{u.output_tokens}
                          </td>
                          <td className="py-1.5 pr-2 text-right text-gray-900 whitespace-nowrap">{formatUsd(u.cost_usd)}</td>
                          <td className="py-1.5 text-right whitespace-nowrap">
                            <span className={u.status === 'ok' ? 'text-green-700' : 'text-red-600'}>{u.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs font-semibold text-gray-900">Total: {formatUsd(usageTotal)}</p>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, block }: { label: string; value: string | null; block?: boolean }) {
  if (block) {
    return (
      <div>
        <dt className="text-xs text-gray-500">{label}</dt>
        <dd className="text-gray-900">{value ?? '—'}</dd>
      </div>
    );
  }
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-900 text-right">{value ?? '—'}</dd>
    </div>
  );
}

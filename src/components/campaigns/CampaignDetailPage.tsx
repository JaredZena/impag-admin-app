import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckSquare,
  Loader2,
  MessageCircle,
  RefreshCw,
  Rocket,
  Trash2,
} from 'lucide-react';
import { useNotifications } from '@/components/ui/notification';
import {
  activateCampaign,
  deleteCampaign,
  fetchCampaign,
  generatePlan,
  generatePostForItem,
  updateItem,
} from '@/utils/campaignsApi';
import {
  Campaign,
  CampaignItem,
  CampaignItemStatus,
  CAMPAIGN_CHANNEL_META,
  CAMPAIGN_SIZE_LABELS,
  CAMPAIGN_STATUS_META,
} from '@/types/campaigns';
import ItemRow from './ItemRow';
import PhaseSection from './PhaseSection';

type ConfirmAction = 'activate' | 'regenerate' | 'delete';

const formatDateEsMX = (iso: string | null, withYear = false): string => {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  });
};

const patchItemInCampaign = (
  campaign: Campaign,
  itemId: number,
  patch: Partial<CampaignItem>
): Campaign => ({
  ...campaign,
  phases: (campaign.phases || []).map(phase => ({
    ...phase,
    items: phase.items.map(item => (item.id === itemId ? { ...item, ...patch } : item)),
  })),
  orphan_items: campaign.orphan_items?.map(item =>
    item.id === itemId ? { ...item, ...patch } : item
  ),
});

const CampaignDetailPage: React.FC = () => {
  const { id } = useParams();
  const campaignId = Number(id);
  const navigate = useNavigate();
  const { addNotification } = useNotifications();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [tasksCreated, setTasksCreated] = useState<number | null>(null);
  const [generatingPostIds, setGeneratingPostIds] = useState<number[]>([]);

  // Guard: the auto plan generation must fire at most once per page visit.
  const planFiredRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setCampaign(await fetchCampaign(campaignId));
    } catch (e) {
      console.error('Failed to load campaign', e);
      setLoadError(true);
      addNotification({
        type: 'error',
        title: 'Error al cargar la campaña',
        message: e instanceof Error ? e.message : undefined,
        duration: 6000,
      });
    } finally {
      setLoading(false);
    }
  }, [campaignId, addNotification]);

  useEffect(() => {
    planFiredRef.current = false;
    if (Number.isNaN(campaignId)) {
      setLoading(false);
      setLoadError(true);
      return;
    }
    load();
  }, [campaignId, load]);

  const runGeneratePlan = useCallback(async () => {
    setPlanLoading(true);
    try {
      const updated = await generatePlan(campaignId);
      setCampaign(updated);
      addNotification({ type: 'success', title: 'Plan de campaña generado', duration: 4000 });
    } catch (e) {
      addNotification({
        type: 'error',
        title: 'Error al generar el plan',
        message: e instanceof Error ? e.message : undefined,
        duration: 6000,
      });
    } finally {
      setPlanLoading(false);
    }
  }, [campaignId, addNotification]);

  // Auto-generate the plan the first time a draft campaign without phases loads.
  // The `campaign.id === campaignId` guard keeps a stale campaign object (from a
  // previous :id param) from triggering generation against the new campaign.
  useEffect(() => {
    if (!campaign || campaign.id !== campaignId || planFiredRef.current || planLoading) return;
    if (campaign.status === 'draft' && (!campaign.phases || campaign.phases.length === 0)) {
      planFiredRef.current = true;
      runGeneratePlan();
    }
  }, [campaign, campaignId, planLoading, runGeneratePlan]);

  const pendingTaskCount = useMemo(() => {
    if (!campaign?.phases) return 0;
    return campaign.phases
      .flatMap(p => p.items)
      .filter(i => (i.kind === 'task' || i.kind === 'whatsapp' || i.kind === 'research') && i.task_id == null)
      .length;
  }, [campaign]);

  const handleItemStatusChange = async (item: CampaignItem, status: CampaignItemStatus) => {
    if (!campaign) return;
    const prevStatus = item.status;
    setCampaign(current => (current ? patchItemInCampaign(current, item.id, { status }) : current));
    try {
      const updated = await updateItem(item.id, { status });
      setCampaign(current => (current ? patchItemInCampaign(current, item.id, updated) : current));
    } catch (e) {
      // Roll back only the affected item so concurrent server-confirmed
      // changes to other items (e.g. a generated post) are preserved.
      setCampaign(current =>
        current ? patchItemInCampaign(current, item.id, { status: prevStatus }) : current
      );
      addNotification({
        type: 'error',
        title: 'Error al actualizar el elemento',
        message: e instanceof Error ? e.message : undefined,
        duration: 5000,
      });
    }
  };

  const handleGeneratePost = async (item: CampaignItem) => {
    setGeneratingPostIds(ids => [...ids, item.id]);
    try {
      const res = await generatePostForItem(item.id);
      setCampaign(current => (current ? patchItemInCampaign(current, item.id, res.item) : current));
      addNotification({ type: 'success', title: 'Post agregado al calendario social', duration: 4000 });
    } catch (e) {
      addNotification({
        type: 'error',
        title: 'Error al generar el post',
        message: e instanceof Error ? e.message : undefined,
        duration: 6000,
      });
    } finally {
      setGeneratingPostIds(ids => ids.filter(x => x !== item.id));
    }
  };

  const handleCopyContent = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addNotification({ type: 'success', title: 'Mensaje copiado al portapapeles', duration: 3000 });
    } catch {
      addNotification({ type: 'error', title: 'Error al copiar', duration: 3000 });
    }
  };

  const handleActivate = async () => {
    setConfirmAction(null);
    setActionLoading(true);
    try {
      const res = await activateCampaign(campaignId);
      setCampaign(res.campaign);
      setTasksCreated(res.tasks_created);
      addNotification({
        type: 'success',
        title: `${res.tasks_created} tareas creadas`,
        message: 'La campaña está activa.',
        duration: 5000,
      });
    } catch (e) {
      addNotification({
        type: 'error',
        title: 'Error al activar la campaña',
        message: e instanceof Error ? e.message : undefined,
        duration: 6000,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegenerate = () => {
    setConfirmAction(null);
    planFiredRef.current = true;
    runGeneratePlan();
  };

  const handleDelete = async () => {
    setConfirmAction(null);
    setActionLoading(true);
    try {
      await deleteCampaign(campaignId);
      addNotification({ type: 'success', title: 'Campaña eliminada', duration: 3000 });
      navigate('/campaigns');
    } catch (e) {
      setActionLoading(false);
      addNotification({
        type: 'error',
        title: 'Error al eliminar la campaña',
        message: e instanceof Error ? e.message : undefined,
        duration: 6000,
      });
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        <p className="text-gray-500 text-sm">Cargando campaña…</p>
      </div>
    );
  }

  if (loadError || !campaign) {
    return (
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        <Link to="/campaigns" className="text-sm text-blue-700 hover:underline">← Campañas</Link>
        <p className="text-gray-500 text-sm mt-4">No se encontró la campaña.</p>
      </div>
    );
  }

  const statusMeta = CAMPAIGN_STATUS_META[campaign.status];
  const channelPlan = campaign.channel_plan;
  const research = campaign.research;
  const phases = campaign.phases || [];
  // Items preserved through a plan regeneration (they already have a Task or
  // SocialPost, so the backend keeps them instead of duplicating the work).
  const orphanItems = campaign.orphan_items || [];

  const confirmMeta: Record<ConfirmAction, { title: string; message: string; cta: string; danger?: boolean; onConfirm: () => void }> = {
    activate: {
      title: 'Activar campaña',
      message: `Se crearán ${pendingTaskCount} tareas para los elementos de preparación y WhatsApp.`,
      cta: 'Sí, activar',
      onConfirm: handleActivate,
    },
    regenerate: {
      title: 'Regenerar plan',
      message: 'Se reemplazarán las fases y elementos actuales con un plan nuevo. Esta acción no se puede deshacer.',
      cta: 'Sí, regenerar',
      onConfirm: handleRegenerate,
    },
    delete: {
      title: 'Eliminar campaña',
      message: 'Se eliminará la campaña con sus fases y elementos. Las tareas y posts ya creados se conservan.',
      cta: 'Sí, eliminar',
      danger: true,
      onConfirm: handleDelete,
    },
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* ── Header ────────────────────────────────────────────────── */}
      <Link to="/campaigns" className="text-sm text-blue-700 hover:underline">← Campañas</Link>
      <div className="flex items-center gap-2 flex-wrap mt-2 mb-1">
        <h1 className="text-xl font-bold text-gray-800">{campaign.title}</h1>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusMeta?.cls || ''}`}>
          {statusMeta?.label || campaign.status}
        </span>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200">
          {CAMPAIGN_SIZE_LABELS[campaign.size] || campaign.size}
        </span>
        {channelPlan?.whatsapp_notify && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-green-50 text-green-700 border-green-200">
            📣 Incluye WhatsApp
          </span>
        )}
      </div>
      {(campaign.start_date || campaign.end_date) && (
        <p className="text-sm text-gray-500 mb-4">
          {formatDateEsMX(campaign.start_date)} – {formatDateEsMX(campaign.end_date, true)}
        </p>
      )}

      {/* ── Actions ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        {campaign.status === 'draft' && (
          <button
            onClick={() => setConfirmAction('activate')}
            disabled={actionLoading || planLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {actionLoading ? <Loader2 size={15} className="animate-spin" /> : <Rocket size={15} />}
            Activar campaña
          </button>
        )}
        <button
          onClick={() => setConfirmAction('regenerate')}
          disabled={actionLoading || planLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <RefreshCw size={15} /> Regenerar plan
        </button>
        <button
          onClick={() => setConfirmAction('delete')}
          disabled={actionLoading || planLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 bg-white text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Trash2 size={15} /> Eliminar
        </button>
      </div>

      {tasksCreated !== null && (
        <div className="flex items-center gap-2 mb-6 px-3 py-2.5 rounded-lg border border-green-200 bg-green-50 text-green-700 text-sm font-medium">
          <CheckSquare size={15} className="flex-shrink-0" />
          <span>{tasksCreated} tareas creadas.</span>
          <Link to="/tasks" className="text-green-800 font-semibold hover:underline">Ver tareas →</Link>
        </div>
      )}

      {/* ── Estrategia ────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 sm:p-5 shadow-sm mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Estrategia</h2>
        {campaign.objective && <p className="text-sm text-gray-600 mb-3">{campaign.objective}</p>}
        {campaign.audience && (
          <p className="text-xs text-gray-500 mb-3"><span className="font-medium text-gray-600">Audiencia:</span> {campaign.audience}</p>
        )}

        {campaign.goals && campaign.goals.length > 0 && (
          <div className="mb-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Metas</h3>
            <ul className="space-y-1">
              {campaign.goals.map((g, idx) => (
                <li key={idx} className="text-sm text-gray-600">
                  • {g.goal}
                  <span className="text-xs text-gray-400"> — {g.metric}: {g.target}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {campaign.key_messages && campaign.key_messages.length > 0 && (
          <div className="mb-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Mensajes clave</h3>
            <div className="flex flex-wrap gap-1.5">
              {campaign.key_messages.map((msg, idx) => (
                <span key={idx} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                  {msg}
                </span>
              ))}
            </div>
          </div>
        )}

        {channelPlan && channelPlan.channels.length > 0 && (
          <div className="mb-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Plan de canales</h3>
            <div className="flex flex-wrap gap-1.5">
              {channelPlan.channels.map((ch, idx) => {
                const meta = CAMPAIGN_CHANNEL_META[ch.channel];
                return (
                  <span
                    key={idx}
                    title={ch.rationale}
                    className={`text-xs font-medium px-2 py-1 rounded-full border cursor-help ${meta?.cls || 'bg-gray-100 text-gray-600 border-gray-200'}`}
                  >
                    {meta?.label || ch.channel} · {ch.frequency_per_week}x/semana
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {channelPlan && (
          channelPlan.whatsapp_notify ? (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-green-200 bg-green-50">
              <MessageCircle size={15} className="text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-green-800">
                <span className="font-semibold">Notificar clientes por WhatsApp:</span>{' '}
                {channelPlan.whatsapp_rationale || 'Campaña de alto impacto.'}
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">Solo publicación en redes (campaña chica)</p>
          )
        )}
      </div>

      {/* ── Investigación ─────────────────────────────────────────── */}
      {research && (
        <details className="bg-white border border-gray-100 rounded-xl shadow-sm mb-6 group">
          <summary className="text-sm font-semibold text-gray-700 p-4 sm:p-5 cursor-pointer select-none list-none flex items-center justify-between">
            Investigación
            <span className="text-gray-400 text-xs group-open:hidden">Mostrar</span>
            <span className="text-gray-400 text-xs hidden group-open:inline">Ocultar</span>
          </summary>
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3">
            {research.seasonality_notes && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Temporada</h3>
                <p className="text-sm text-gray-600">{research.seasonality_notes}</p>
              </div>
            )}
            {research.market_context && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Mercado</h3>
                <p className="text-sm text-gray-600">{research.market_context}</p>
              </div>
            )}
            {research.important_dates && research.important_dates.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Fechas importantes</h3>
                <ul className="space-y-1">
                  {research.important_dates.map((d, idx) => (
                    <li key={idx} className="text-sm text-gray-600">
                      • <span className="font-medium">{formatDateEsMX(d.date) || d.date}</span> — {d.name}
                      {d.relevance && <span className="text-xs text-gray-400"> ({d.relevance})</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {research.product_focus && research.product_focus.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Productos foco</h3>
                <div className="flex flex-wrap gap-1.5">
                  {research.product_focus.map((p, idx) => (
                    <span key={idx} className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </details>
      )}

      {/* ── Plan (fases + elementos) ──────────────────────────────── */}
      {planLoading ? (
        <div className="flex flex-col items-center justify-center text-center py-14 bg-white border border-gray-100 rounded-xl">
          <Loader2 size={28} className="text-blue-600 animate-spin mb-4" />
          <h3 className="text-base font-semibold text-gray-900 mb-1.5">Generando plan de campaña…</h3>
          <p className="text-sm text-gray-500 max-w-xs">
            Estamos creando las fases y los elementos de contenido. Esto toma ~1 minuto.
          </p>
        </div>
      ) : phases.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-14 bg-white border border-gray-100 rounded-xl">
          <h3 className="text-base font-semibold text-gray-900 mb-1.5">Sin plan todavía</h3>
          <p className="text-sm text-gray-500 mb-4 max-w-xs">
            Genera el plan para obtener fases y elementos de contenido con fechas.
          </p>
          <button
            onClick={handleRegenerate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <RefreshCw size={15} /> Generar plan
          </button>
        </div>
      ) : (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Plan de campaña</h2>
          {phases.map((phase, idx) => (
            <PhaseSection
              key={phase.id}
              phase={phase}
              index={idx}
              generatingPostIds={generatingPostIds}
              onItemStatusChange={handleItemStatusChange}
              onGeneratePost={handleGeneratePost}
              onCopyContent={handleCopyContent}
            />
          ))}
        </div>
      )}

      {/* ── Elementos conservados (sin fase) ──────────────────────── */}
      {!planLoading && orphanItems.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Elementos de planes anteriores</h2>
          <p className="text-xs text-gray-500 mb-3">
            Se conservaron porque ya tienen tareas o posts creados.
          </p>
          <div className="space-y-1.5">
            {orphanItems.map(item => (
              <ItemRow
                key={item.id}
                item={item}
                generatingPost={generatingPostIds.includes(item.id)}
                onStatusChange={handleItemStatusChange}
                onGeneratePost={handleGeneratePost}
                onCopyContent={handleCopyContent}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Confirm dialog ────────────────────────────────────────── */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <div className="rounded-xl p-6 max-w-sm w-full shadow-lg border border-gray-200 bg-white">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${confirmMeta[confirmAction].danger ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                <AlertTriangle size={16} className={confirmMeta[confirmAction].danger ? 'text-red-500' : 'text-amber-500'} />
              </div>
              <h3 className="font-semibold text-sm text-gray-900">{confirmMeta[confirmAction].title}</h3>
            </div>
            <p className="text-sm mb-4 text-gray-600">{confirmMeta[confirmAction].message}</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-3 py-2 rounded-md border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmMeta[confirmAction].onConfirm}
                className={`px-3 py-2 rounded-md text-white text-sm font-medium transition-colors ${confirmMeta[confirmAction].danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {confirmMeta[confirmAction].cta}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignDetailPage;

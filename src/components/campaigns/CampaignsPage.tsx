import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Megaphone, Sparkles } from 'lucide-react';
import { useNotifications } from '@/components/ui/notification';
import { generateCampaign, fetchCampaigns } from '@/utils/campaignsApi';
import {
  Campaign,
  CAMPAIGN_SIZE_LABELS,
  CAMPAIGN_STATUS_META,
} from '@/types/campaigns';

const DURATION_OPTIONS = [2, 3, 4, 6, 8];

const todayISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

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

const CampaignsPage: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const [topic, setTopic] = useState('');
  const [startDate, setStartDate] = useState(todayISO());
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stageMsg, setStageMsg] = useState('');

  const stageTimerRef = useRef<number | null>(null);
  const topicRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        setCampaigns((await fetchCampaigns()) || []);
      } catch (e) {
        console.error('Failed to load campaigns', e);
        addNotification({
          type: 'error',
          title: 'Error al cargar las campañas',
          message: e instanceof Error ? e.message : undefined,
          duration: 6000,
        });
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => {
      if (stageTimerRef.current) window.clearTimeout(stageTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = async () => {
    const trimmed = topic.trim();
    if (!trimmed) {
      addNotification({ type: 'warning', title: 'Escribe el tema de la campaña', duration: 4000 });
      topicRef.current?.focus();
      return;
    }
    setSubmitting(true);
    setStageMsg('Analizando temporada y mercado…');
    stageTimerRef.current = window.setTimeout(
      () => setStageMsg('Diseñando estrategia y canales…'),
      20000
    );
    try {
      const campaign = await generateCampaign({
        topic: trimmed,
        start_date: startDate || undefined,
        duration_weeks: durationWeeks,
        notes: notes.trim() || undefined,
      });
      navigate(`/campaigns/${campaign.id}`);
    } catch (e) {
      addNotification({
        type: 'error',
        title: 'Error al generar la campaña',
        message: e instanceof Error ? e.message : undefined,
        duration: 6000,
      });
      setSubmitting(false);
      setStageMsg('');
      if (stageTimerRef.current) window.clearTimeout(stageTimerRef.current);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <h1 className="text-xl font-bold text-gray-800 mb-1">Campañas</h1>
      <p className="text-sm text-gray-500 mb-6">
        Genera campañas de marketing completas a partir de un tema: objetivo, canales, fases y
        contenido listo para el calendario social y las tareas.
      </p>

      {/* ── Nueva campaña ─────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 sm:p-5 shadow-sm mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Sparkles size={16} className="text-blue-600" /> Nueva campaña
        </h2>

        <textarea
          ref={topicRef}
          value={topic}
          onChange={e => setTopic(e.target.value)}
          rows={2}
          maxLength={500}
          disabled={submitting}
          placeholder="Ej: Promoción de kits de bombeo solar para la temporada de riego"
          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-gray-50 disabled:text-gray-400"
        />

        <div className="flex flex-wrap items-end gap-3 mt-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Inicio</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              disabled={submitting}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Duración</label>
            <select
              value={durationWeeks}
              onChange={e => setDurationWeeks(Number(e.target.value))}
              disabled={submitting}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50 cursor-pointer"
            >
              {DURATION_OPTIONS.map(w => (
                <option key={w} value={w}>{w} semanas</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Notas <span className="text-gray-400">(opcional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={submitting}
              placeholder="Ej: enfocar en clientes de nogal"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Generar campaña
          </button>
        </div>

        {submitting && (
          <div className="flex items-center gap-2 mt-3 px-3 py-2.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium">
            <Loader2 size={15} className="animate-spin flex-shrink-0" />
            {stageMsg}
          </div>
        )}
      </div>

      {/* ── Lista de campañas ─────────────────────────────────────── */}
      {loading ? (
        <p className="text-gray-500 text-sm">Cargando campañas…</p>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-14 bg-white border border-gray-100 rounded-xl">
          <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
            <Megaphone size={26} className="text-gray-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1.5">Aún no hay campañas</h3>
          <p className="text-sm text-gray-500 mb-5 max-w-xs">
            Escribe un tema arriba y genera tu primera campaña de marketing con IA.
          </p>
          <button
            onClick={() => topicRef.current?.focus()}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Crear mi primera campaña
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => {
            const statusMeta = CAMPAIGN_STATUS_META[c.status];
            const total = c.items_total ?? 0;
            const done = c.items_done ?? 0;
            const pct = total ? Math.round((done / total) * 100) : 0;
            return (
              <button
                key={c.id}
                onClick={() => navigate(`/campaigns/${c.id}`)}
                className="w-full text-left bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:border-blue-200 hover:shadow transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-gray-800">{c.title}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusMeta?.cls || ''}`}>
                        {statusMeta?.label || c.status}
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200">
                        {CAMPAIGN_SIZE_LABELS[c.size] || c.size}
                      </span>
                      {c.channel_plan?.whatsapp_notify && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-green-50 text-green-700 border-green-200">
                          📣 Incluye WhatsApp
                        </span>
                      )}
                    </div>
                    {(c.start_date || c.end_date) && (
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDateEsMX(c.start_date)} – {formatDateEsMX(c.end_date, true)}
                      </p>
                    )}
                  </div>
                  {total > 0 && (
                    <div className="shrink-0 text-right">
                      <span className="text-xs font-medium text-gray-600">{done}/{total}</span>
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CampaignsPage;

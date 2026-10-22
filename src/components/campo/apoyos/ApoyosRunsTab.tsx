import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import { listApoyoRuns } from '@/utils/apoyosApi';
import type { ApoyoRun } from '@/types/apoyos';
import { formatUsd } from '@/utils/campoTaxonomy';
import LoadError from '@/components/ui/LoadError';
import RunNowButton from './RunNowButton';

const RUN_STATUS_LABELS: Record<ApoyoRun['status'], string> = {
  queued: 'En cola',
  running: 'Corriendo',
  done: 'Terminada',
  failed: 'Falló',
  cancelled: 'Cancelada',
};

const RUN_STATUS_CLASSES: Record<ApoyoRun['status'], string> = {
  queued: 'bg-gray-100 text-gray-600',
  running: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const TOPIC_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  running: 'Corriendo',
  done: 'Hecho',
  error: 'Error',
  skipped: 'Omitido',
};

function duration(run: ApoyoRun): string {
  if (!run.started_at) return '—';
  const end = run.finished_at ? dayjs(run.finished_at) : dayjs();
  const mins = end.diff(dayjs(run.started_at), 'minute');
  if (mins < 1) return '<1 min';
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min`;
}

function RunRow({ run }: { run: ApoyoRun }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr
        className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <td className="px-4 py-3">
          <button type="button" className="text-gray-400" aria-label={open ? 'Ocultar temas' : 'Ver temas'}>
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        </td>
        <td className="px-4 py-3 text-sm text-gray-700">{dayjs(run.created_at).format('DD MMM YYYY HH:mm')}</td>
        <td className="px-4 py-3 text-sm text-gray-700">{run.trigger === 'manual' ? 'Manual' : 'Programada'}</td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${RUN_STATUS_CLASSES[run.status]}`}>
            {RUN_STATUS_LABELS[run.status]}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-700">
          {run.progress.done}/{run.progress.total}
        </td>
        <td className="px-4 py-3 text-sm text-gray-700">
          {run.new_count} nuevos · {run.updated_count} act.
        </td>
        <td className="px-4 py-3 text-sm text-gray-700">{run.web_searches}</td>
        <td className="px-4 py-3 text-sm text-gray-700">{formatUsd(run.cost_usd)}</td>
        <td className="px-4 py-3 text-sm text-gray-700">{duration(run)}</td>
      </tr>
      {open && (
        <tr className="border-b border-gray-50 bg-gray-50/60">
          <td colSpan={8} className="px-4 py-3">
            {run.error && <p className="text-sm text-red-600 mb-2">Error: {run.error}</p>}
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500">
                  <th className="text-left py-1">Tema</th>
                  <th className="text-left py-1">Estado</th>
                  <th className="text-right py-1">Encontrados</th>
                  <th className="text-right py-1">Nuevos</th>
                  <th className="text-right py-1">Actualizados</th>
                  <th className="text-right py-1">Costo</th>
                  <th className="text-left py-1">Error</th>
                </tr>
              </thead>
              <tbody>
                {run.topics.map((t) => (
                  <tr key={t.key} className="border-t border-gray-100">
                    <td className="py-1.5 text-gray-900">{t.label}</td>
                    <td className="py-1.5 text-gray-600">{TOPIC_STATUS_LABELS[t.status] ?? t.status}</td>
                    <td className="py-1.5 text-right text-gray-600">{t.found}</td>
                    <td className="py-1.5 text-right text-gray-600">{t.new}</td>
                    <td className="py-1.5 text-right text-gray-600">{t.updated}</td>
                    <td className="py-1.5 text-right text-gray-600">{formatUsd(t.cost_usd)}</td>
                    <td className="py-1.5 text-red-600">{t.error || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}

export default function ApoyosRunsTab() {
  const [runs, setRuns] = useState<ApoyoRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchRuns = () => {
    setLoading(true);
    setLoadError(null);
    listApoyoRuns(50)
      .then(setRuns)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Intenta de nuevo.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  return (
    <div>
      <div className="mb-4">
        <RunNowButton onRunFinished={fetchRuns} />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : loadError ? (
        <LoadError message={loadError} onRetry={fetchRuns} />
      ) : runs.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white border border-gray-100 rounded-xl">
          <p className="text-gray-700">Todavía no hay búsquedas registradas.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white border border-gray-100 rounded-xl">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 w-8" />
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Fecha</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Origen</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Estado</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Progreso</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Hallazgos</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Búsquedas web</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Costo</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Duración</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <RunRow key={run.id} run={run} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

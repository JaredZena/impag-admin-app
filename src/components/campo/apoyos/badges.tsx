import type { ApoyoConfidence, ApoyoStatus, ApoyoWindow } from '@/types/apoyos';

const BASE = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap';

// ---------------------------------------------------------------------------
// Review status (draft/published/rejected/archived)
// ---------------------------------------------------------------------------

export const APOYO_STATUS_LABELS: Record<ApoyoStatus, string> = {
  draft: 'Por revisar',
  published: 'Publicado',
  rejected: 'Descartado',
  archived: 'Archivado',
};

const STATUS_CLASSES: Record<ApoyoStatus, string> = {
  draft: 'bg-amber-100 text-amber-800',
  published: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  archived: 'bg-gray-100 text-gray-500',
};

export function ApoyoStatusBadge({ status }: { status: ApoyoStatus }) {
  return <span className={`${BASE} ${STATUS_CLASSES[status]}`}>{APOYO_STATUS_LABELS[status]}</span>;
}

// ---------------------------------------------------------------------------
// Window (abierta/proxima/permanente/cerrada/sin-fecha)
// ---------------------------------------------------------------------------

export const WINDOW_LABELS: Record<ApoyoWindow, string> = {
  abierta: 'Abierta',
  proxima: 'Próximamente',
  permanente: 'Todo el año',
  cerrada: 'Cerrada',
  'sin-fecha': 'Fecha por confirmar',
};

const WINDOW_CLASSES: Record<ApoyoWindow, string> = {
  abierta: 'bg-green-100 text-green-700',
  proxima: 'bg-blue-100 text-blue-700',
  permanente: 'bg-purple-100 text-purple-700',
  cerrada: 'bg-gray-100 text-gray-500',
  'sin-fecha': 'bg-orange-100 text-orange-700',
};

export function ApoyoWindowBadge({
  window,
  daysLeft,
}: {
  window: ApoyoWindow;
  daysLeft?: number | null;
}) {
  const showDays = window === 'abierta' && typeof daysLeft === 'number' && daysLeft <= 30;
  return (
    <span className={`${BASE} ${WINDOW_CLASSES[window]}`}>
      {WINDOW_LABELS[window]}
      {showDays && ` · Cierra en ${daysLeft} día${daysLeft === 1 ? '' : 's'}`}
    </span>
  );
}

// ---------------------------------------------------------------------------
// AI confidence (alta/media/baja/null=manual)
// ---------------------------------------------------------------------------

const CONFIDENCE_LABELS: Record<ApoyoConfidence, string> = {
  alta: 'Confianza alta',
  media: 'Confianza media',
  baja: 'Confianza baja',
};

const CONFIDENCE_CLASSES: Record<ApoyoConfidence, string> = {
  alta: 'bg-green-100 text-green-700',
  media: 'bg-yellow-100 text-yellow-700',
  baja: 'bg-red-100 text-red-700',
};

export function ApoyoConfidenceBadge({ confidence }: { confidence: ApoyoConfidence | null }) {
  if (!confidence) {
    return <span className={`${BASE} bg-gray-100 text-gray-500`}>Agregado a mano</span>;
  }
  return <span className={`${BASE} ${CONFIDENCE_CLASSES[confidence]}`}>{CONFIDENCE_LABELS[confidence]}</span>;
}

// ---------------------------------------------------------------------------
// Source domain (from source_url)
// ---------------------------------------------------------------------------

export function sourceDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

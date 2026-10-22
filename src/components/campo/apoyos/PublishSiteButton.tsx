import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/components/ui/notification';
import { ApiError } from '@/utils/api';
import { getApoyosSiteStatus, publishApoyosSite } from '@/utils/apoyosApi';
import type { ApoyosSiteStatus } from '@/types/apoyos';

// "Publicar en la tienda" — dispatches the storefront's apoyos-publish workflow
// and polls its status, same shape/cadence as PublishStorefrontButton.

const POLL_INTERVAL_MS = 10_000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;
const CLOCK_SKEW_MS = 60_000;

const formatRelativeTime = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMin = Math.floor((Date.now() - then) / 60_000);
  if (diffMin < 1) return 'hace unos segundos';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
};

const runLabel = (status: ApoyosSiteStatus): string => {
  if (status.status === 'completed') {
    if (status.conclusion === 'success') return 'Exitosa';
    if (status.conclusion === 'failure') return 'Falló';
    return 'Completada';
  }
  return 'En curso';
};

export default function PublishSiteButton() {
  const { addNotification } = useNotifications();
  const [publishStatus, setPublishStatus] = useState<ApoyosSiteStatus | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [tokenMissing, setTokenMissing] = useState(false);

  const pollIntervalRef = useRef<number | null>(null);
  const pollDeadlineRef = useRef<number>(0);
  const dispatchTimeRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current !== null) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const fetchStatusRaw = useCallback(async (): Promise<ApoyosSiteStatus | null> => {
    try {
      return await getApoyosSiteStatus();
    } catch (err) {
      console.error('Error fetching apoyos site status:', err);
      return null;
    }
  }, []);

  const fetchStatus = useCallback(async (): Promise<ApoyosSiteStatus | null> => {
    const data = await fetchStatusRaw();
    if (data) setPublishStatus(data);
    return data;
  }, [fetchStatusRaw]);

  const startPolling = useCallback(() => {
    stopPolling();
    pollDeadlineRef.current = Date.now() + POLL_TIMEOUT_MS;
    pollIntervalRef.current = window.setInterval(async () => {
      if (Date.now() > pollDeadlineRef.current) {
        stopPolling();
        dispatchTimeRef.current = null;
        fetchStatus();
        return;
      }
      const data = await fetchStatusRaw();
      if (!data) return;
      if (!data.configured) {
        setPublishStatus(data);
        stopPolling();
        return;
      }
      const dispatchedAt = dispatchTimeRef.current;
      const runIsFresh =
        dispatchedAt === null ||
        (!!data.created_at && new Date(data.created_at).getTime() >= dispatchedAt - CLOCK_SKEW_MS);
      if (!runIsFresh) return;
      setPublishStatus(data);
      if (data.status === 'completed') {
        dispatchTimeRef.current = null;
        stopPolling();
      }
    }, POLL_INTERVAL_MS);
  }, [fetchStatus, fetchStatusRaw, stopPolling]);

  useEffect(() => {
    fetchStatus().then((data) => {
      if (data?.configured && (data.status === 'queued' || data.status === 'in_progress')) {
        startPolling();
      }
    });
    return () => stopPolling();
  }, [fetchStatus, startPolling, stopPolling]);

  const handleDispatch = async () => {
    setDispatching(true);
    try {
      await publishApoyosSite();
      addNotification({
        type: 'success',
        title: 'Publicación iniciada',
        message: 'todoparaelcampo.com.mx se actualizará en unos minutos',
      });
      setPublishStatus((prev) => ({
        configured: true,
        status: 'queued',
        conclusion: null,
        created_at: new Date().toISOString(),
        html_url: prev?.html_url ?? null,
      }));
      dispatchTimeRef.current = Date.now();
      startPolling();
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setTokenMissing(true);
        addNotification({ type: 'error', title: 'Configuración pendiente', message: 'Falta token de GitHub en el servidor' });
      } else {
        addNotification({
          type: 'error',
          title: 'Error al publicar',
          message: (err instanceof Error && err.message) || 'No se pudo iniciar la publicación',
        });
      }
    } finally {
      setDispatching(false);
    }
  };

  const notConfigured = publishStatus?.configured === false || tokenMissing;
  const runInProgress =
    publishStatus?.configured === true && (publishStatus.status === 'queued' || publishStatus.status === 'in_progress');

  return (
    <div className="flex flex-col items-start gap-1">
      <Button onClick={handleDispatch} disabled={notConfigured || runInProgress || dispatching} variant="outline">
        <Rocket size={16} />
        {runInProgress ? 'Publicación en curso...' : dispatching ? 'Publicando...' : 'Publicar en la tienda'}
      </Button>
      {(notConfigured || tokenMissing) && (
        <p className="text-xs text-gray-500">Configuración pendiente (falta token de GitHub en el servidor)</p>
      )}
      {!notConfigured && publishStatus?.configured && publishStatus.status && publishStatus.created_at && (
        <p className="text-xs text-gray-500">
          Última publicación: {formatRelativeTime(publishStatus.created_at)} · {runLabel(publishStatus)}
          {publishStatus.html_url && (
            <>
              {' · '}
              <a
                href={publishStatus.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-700 hover:underline"
              >
                Ver detalle <ExternalLink size={11} />
              </a>
            </>
          )}
        </p>
      )}
    </div>
  );
}

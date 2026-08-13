import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/components/ui/notification';
import { apiRequest, ApiError } from '@/utils/api';

interface PublishStatus {
  configured: boolean;
  status?: 'queued' | 'in_progress' | 'completed' | null;
  conclusion?: 'success' | 'failure' | null;
  created_at?: string | null;
  html_url?: string | null;
}

const POLL_INTERVAL_MS = 10_000; // 10s
const POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5 min
// GitHub can take longer than one poll tick to register a dispatched run; a
// "completed" run older than the dispatch (minus clock skew) is the PREVIOUS
// run and must not stop the poll.
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

const runLabel = (status: PublishStatus): string => {
  if (status.status === 'completed') {
    if (status.conclusion === 'success') return 'Exitosa';
    if (status.conclusion === 'failure') return 'Falló';
    return 'Completada';
  }
  return 'En curso';
};

const PublishStorefrontButton: React.FC = () => {
  const { addNotification } = useNotifications();
  const [publishStatus, setPublishStatus] = useState<PublishStatus | null>(null);
  const [confirming, setConfirming] = useState(false);
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

  const fetchStatusRaw = useCallback(async (): Promise<PublishStatus | null> => {
    try {
      return await apiRequest('/storefront/publish-status');
    } catch (err) {
      console.error('Error fetching storefront publish status:', err);
      return null;
    }
  }, []);

  const fetchStatus = useCallback(async (): Promise<PublishStatus | null> => {
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
        // Converge the UI to whatever GitHub reports rather than leaving a
        // stale optimistic "queued" that keeps the button disabled.
        fetchStatus();
        return;
      }
      const data = await fetchStatusRaw();
      if (!data) return; // transient error — keep polling until the deadline
      if (!data.configured) {
        setPublishStatus(data);
        stopPolling();
        return;
      }
      const dispatchedAt = dispatchTimeRef.current;
      const runIsFresh =
        dispatchedAt === null ||
        (!!data.created_at &&
          new Date(data.created_at).getTime() >= dispatchedAt - CLOCK_SKEW_MS);
      if (!runIsFresh) return; // previous run — keep optimistic state, keep polling
      setPublishStatus(data);
      if (data.status === 'completed') {
        dispatchTimeRef.current = null;
        stopPolling();
      }
    }, POLL_INTERVAL_MS);
  }, [fetchStatus, fetchStatusRaw, stopPolling]);

  // Fetch status on mount; resume polling if a run is already underway
  // (e.g. the user navigated away and back mid-publish).
  useEffect(() => {
    fetchStatus().then(data => {
      if (data?.configured && (data.status === 'queued' || data.status === 'in_progress')) {
        startPolling();
      }
    });
    return () => stopPolling();
  }, [fetchStatus, startPolling, stopPolling]);

  const handleDispatch = async () => {
    setDispatching(true);
    try {
      await apiRequest('/storefront/publish', { method: 'POST' });
      setConfirming(false);
      addNotification({
        type: 'success',
        title: 'Publicación iniciada',
        message: 'La tienda se actualizará en unos minutos',
      });
      // Optimistic: mark as queued while the workflow run registers
      setPublishStatus(prev => ({
        configured: true,
        status: 'queued',
        conclusion: null,
        created_at: new Date().toISOString(),
        html_url: prev?.html_url ?? null,
      }));
      dispatchTimeRef.current = Date.now();
      startPolling();
    } catch (err: any) {
      setConfirming(false);
      if (err instanceof ApiError && err.status === 503) {
        setTokenMissing(true);
        addNotification({
          type: 'error',
          title: 'Configuración pendiente',
          message: 'Falta token de GitHub en el servidor',
        });
      } else {
        addNotification({
          type: 'error',
          title: 'Error al publicar',
          message: err?.message || 'No se pudo iniciar la publicación',
        });
      }
    } finally {
      setDispatching(false);
    }
  };

  const notConfigured = publishStatus?.configured === false || tokenMissing;
  const runInProgress =
    publishStatus?.configured === true &&
    (publishStatus.status === 'queued' || publishStatus.status === 'in_progress');

  const helperText = tokenMissing
    ? 'Configuración pendiente (falta token de GitHub en el servidor)'
    : notConfigured
      ? 'Configuración pendiente'
      : null;

  return (
    <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
      {confirming ? (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">¿Confirmar publicación?</span>
          <Button
            size="sm"
            onClick={handleDispatch}
            disabled={dispatching}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {dispatching ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Publicando...</span>
              </>
            ) : (
              'Sí'
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirming(false)}
            disabled={dispatching}
          >
            Cancelar
          </Button>
        </div>
      ) : (
        <Button
          onClick={() => setConfirming(true)}
          disabled={notConfigured || runInProgress}
          className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <span>{runInProgress ? 'Publicación en curso...' : 'Publicar en tienda'}</span>
        </Button>
      )}

      {helperText && <p className="text-xs text-gray-500">{helperText}</p>}

      {!notConfigured && publishStatus?.configured && publishStatus.status && publishStatus.created_at && (
        <p className="text-xs text-gray-500">
          Última publicación: {formatRelativeTime(publishStatus.created_at)} — {runLabel(publishStatus)}
          {publishStatus.html_url && (
            <>
              {' · '}
              <a
                href={publishStatus.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 hover:underline"
              >
                Ver detalle
              </a>
            </>
          )}
        </p>
      )}
    </div>
  );
};

export default PublishStorefrontButton;

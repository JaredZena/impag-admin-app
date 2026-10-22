import { useCallback, useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/components/ui/notification';
import { ApiError } from '@/utils/api';
import { createApoyoRun, getApoyoRun } from '@/utils/apoyosApi';
import type { ApoyoRun } from '@/types/apoyos';

const POLL_INTERVAL_MS = 10_000;

// "Buscar apoyos ahora" — starts a manual discovery run and polls its
// progress every 10s until it finishes (done/failed/cancelled).
export default function RunNowButton({ onRunFinished }: { onRunFinished?: (run: ApoyoRun) => void }) {
  const { addNotification } = useNotifications();
  const [run, setRun] = useState<ApoyoRun | null>(null);
  const [starting, setStarting] = useState(false);
  const pollRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const poll = useCallback(
    (runId: number) => {
      stopPolling();
      pollRef.current = window.setInterval(async () => {
        try {
          const latest = await getApoyoRun(runId);
          setRun(latest);
          if (['done', 'failed', 'cancelled'].includes(latest.status)) {
            stopPolling();
            onRunFinished?.(latest);
            if (latest.status === 'done') {
              addNotification({
                type: 'success',
                title: 'Búsqueda terminada',
                message:
                  latest.new_count > 0
                    ? `${latest.new_count} apoyo${latest.new_count === 1 ? '' : 's'} nuevo${latest.new_count === 1 ? '' : 's'} por revisar`
                    : 'No se encontraron apoyos nuevos',
              });
            } else if (latest.status === 'failed') {
              addNotification({ type: 'error', title: 'La búsqueda falló', message: latest.error || 'Intenta de nuevo' });
            }
          }
        } catch (err) {
          console.error('Error polling apoyo run:', err);
        }
      }, POLL_INTERVAL_MS);
    },
    [addNotification, onRunFinished, stopPolling],
  );

  const handleStart = async () => {
    setStarting(true);
    try {
      const result = await createApoyoRun();
      setRun(result);
      if (result.dispatch_error) {
        addNotification({
          type: 'error',
          title: 'No se pudo iniciar la búsqueda',
          message: result.dispatch_error,
        });
      } else {
        addNotification({ type: 'success', title: 'Búsqueda iniciada', message: 'Esto tarda varios minutos' });
        poll(result.id);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        addNotification({ type: 'warning', title: 'Ya hay una búsqueda en curso', message: 'Espera a que termine' });
      } else {
        addNotification({
          type: 'error',
          title: 'Error al iniciar la búsqueda',
          message: (err instanceof Error && err.message) || 'Intenta de nuevo',
        });
      }
    } finally {
      setStarting(false);
    }
  };

  const running = run !== null && ['queued', 'running'].includes(run.status);

  return (
    <div className="flex flex-col items-start gap-1">
      <Button onClick={handleStart} disabled={starting || running} variant="outline">
        <Search size={16} />
        {running ? 'Buscando apoyos...' : starting ? 'Iniciando...' : 'Buscar apoyos ahora'}
      </Button>
      {running && (
        <p className="text-xs text-gray-500">
          Progreso: {run!.progress.done} de {run!.progress.total} temas
          {run!.new_count > 0 && ` · ${run!.new_count} nuevo${run!.new_count === 1 ? '' : 's'}`}
        </p>
      )}
    </div>
  );
}

import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

// Opens a dialog when the page is reached through a link like /sales?capture=1
// (the Hoy buttons), then drops the param so a reload doesn't reopen it.
export const useOpenFromLink = (param: string, open: () => void) => {
  const [params, setParams] = useSearchParams();
  const requested = params.get(param) === '1';

  useEffect(() => {
    if (!requested) return;
    open();
    const next = new URLSearchParams(params);
    next.delete(param);
    setParams(next, { replace: true });
  }, [requested, open, param, params, setParams]);
};

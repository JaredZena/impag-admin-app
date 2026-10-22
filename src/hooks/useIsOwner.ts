import { useEffect, useState } from 'react';
import { apiRequest } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

// Finanzas (punto de equilibrio, estado de resultados, márgenes) se pueden
// limitar a los dueños con OWNER_EMAILS en impag-quot; sin definir (decisión
// 2026-10-22) todo el equipo es dueño. El backend decide (GET /auth/me) y
// bloquea /finance y /sales/margins; aquí sólo se esconde lo que no toca ver.
const cache = new Map<string, Promise<boolean>>();

function fetchIsOwner(email: string): Promise<boolean> {
  let pending = cache.get(email);
  if (!pending) {
    pending = apiRequest('/auth/me')
      .then((res: { data?: { is_owner?: boolean } }) => Boolean(res?.data?.is_owner))
      // Si no se pudo preguntar, no se esconde nada: el backend igual bloquea.
      .catch(() => {
        cache.delete(email);
        return true;
      });
    cache.set(email, pending);
  }
  return pending;
}

/** null mientras se pregunta al servidor. */
export function useIsOwner(): boolean | null {
  const { user } = useAuth();
  const email = user?.email ?? '';
  const [isOwner, setIsOwner] = useState<boolean | null>(null);

  useEffect(() => {
    if (!email) return;
    let alive = true;
    fetchIsOwner(email).then((v) => alive && setIsOwner(v));
    return () => {
      alive = false;
    };
  }, [email]);

  return email ? isOwner : false;
}

import { Lock } from 'lucide-react';
import { useIsOwner } from '@/hooks/useIsOwner';

// Pantallas de finanzas (punto de equilibrio, estado de resultados): sólo dueños.
export default function OwnerRoute({ children }: { children: React.ReactNode }) {
  const isOwner = useIsOwner();
  if (isOwner === null) return <div className="py-16 text-center text-sm text-gray-500">Cargando…</div>;
  if (!isOwner) {
    return (
      <div className="max-w-md mx-auto my-16 text-center px-4">
        <Lock size={32} className="mx-auto text-gray-300 mb-3" />
        <p className="font-medium text-gray-900">Esta pantalla es sólo para los dueños</p>
      </div>
    );
  }
  return <>{children}</>;
}
